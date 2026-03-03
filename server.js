require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 從外部 JSON 載入塔羅牌資料庫
const TAROT_DB = require('./data/tarot_db.json');

// ─── 共用工具函式 ───────────────────────────────────

function drawCards(count) {
  const deck = [...TAROT_DB];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck.splice(randomIndex, 1)[0];
    const isReversed = Math.random() > 0.5;
    drawn.push({
      ...card,
      isReversed,
      direction: isReversed ? '逆位' : '正位',
      currentKeywords: isReversed ? card.keywords.reversed : card.keywords.upright
    });
  }
  return drawn;
}

// 提取 MiniMax API 回傳的文字內容（忽略 reasoning blocks）
function extractMiniMaxText(data) {
  if (data?.choices?.[0]?.message) {
    return data.choices[0].message.content;
  }
  if (data?.content && Array.isArray(data.content)) {
    const textElement = data.content.find(item => item.type === 'text' || (item.text && !item.thinking));
    if (textElement?.text) return textElement.text;
    const anyText = data.content.find(item => item.text);
    if (anyText) return anyText.text;
  }
  return JSON.stringify(data.content || data);
}

// 共用：呼叫 MiniMax API
async function callMiniMax(systemPrompt, userMessage, maxTokens = 1500) {
  const response = await fetch('https://api.minimax.io/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'minimax-2.5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MiniMax API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return extractMiniMaxText(data);
}

// ─── 牌陣文本產生器 ─────────────────────────────────

function buildCardsPrompt(spread, cards) {
  if (spread === 'single') {
    return `抽出的牌：【${cards[0].name_tw}】(${cards[0].direction}) - 涵義：${cards[0].currentKeywords}`;
  }
  if (spread === 'time_flow') {
    return [
      `[過去]：【${cards[0].name_tw}】(${cards[0].direction}) - ${cards[0].currentKeywords}`,
      `[現在]：【${cards[1].name_tw}】(${cards[1].direction}) - ${cards[1].currentKeywords}`,
      `[未來]：【${cards[2].name_tw}】(${cards[2].direction}) - ${cards[2].currentKeywords}`
    ].join('\n');
  }
  if (spread === 'choice') {
    return [
      `[現況]：【${cards[0].name_tw}】(${cards[0].direction}) - ${cards[0].currentKeywords}`,
      `[選擇A-過程]：【${cards[1].name_tw}】(${cards[1].direction}) - ${cards[1].currentKeywords}`,
      `[選擇A-結果]：【${cards[2].name_tw}】(${cards[2].direction}) - ${cards[2].currentKeywords}`,
      `[選擇B-過程]：【${cards[3].name_tw}】(${cards[3].direction}) - ${cards[3].currentKeywords}`,
      `[選擇B-結果]：【${cards[4].name_tw}】(${cards[4].direction}) - ${cards[4].currentKeywords}`
    ].join('\n');
  }
  return '';
}

// ─── API 端點 ───────────────────────────────────────

// 抽牌
app.post('/api/draw_cards', (req, res) => {
  try {
    const { spread } = req.body;
    let drawCount = 1;
    let spreadName = '單張神諭';
    if (spread === 'time_flow') { drawCount = 3; spreadName = '時間之流 (過去/現在/未來)'; }
    if (spread === 'choice') { drawCount = 5; spreadName = '二選一 (現況/A過程/A結果/B過程/B結果)'; }

    const drawnCards = drawCards(drawCount);
    res.json({ success: true, cards: drawnCards, spreadName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解牌
app.post('/api/interpret', async (req, res) => {
  try {
    const { question, spread, spreadName, cards } = req.body;
    const cardsPromptText = buildCardsPrompt(spread, cards);

    const systemPrompt = `你是一個運行在 TAROT_OS 終端機內的「仿生人解碼器 (Android_02)」。語氣溫柔、冷靜、帶有賽博龐克風格。
使用者問題：${question || '未提供，請求系統預設掃描'}。
使用的牌陣陣型：${spreadName}。
${cardsPromptText}

請用賽博龐克、數據流、系統重啟等術語，結合標準牌義進行邏輯嚴密的解讀。如果有多張牌，請說明它們之間的因果與數據流向。保持易讀性，使用 Markdown 粗體強調重點。字數控制在 300 字左右。`;

    const interpretation = await callMiniMax(systemPrompt, '開始解碼。');
    res.json({ success: true, interpretation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 追問
app.post('/api/ask', async (req, res) => {
  try {
    const { history, question, originalContext } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Missing question parameter' });
    }

    let contextText = '';
    if (originalContext) contextText += `[原始牌陣]\n${originalContext}\n\n`;
    if (history && Array.isArray(history)) {
      contextText += `[對話歷史]\n`;
      history.forEach(msg => {
        contextText += `${msg.role === 'user' ? '【使用者】' : '【系統】'}: ${msg.content}\n`;
      });
    }

    const systemPrompt = `你是一個運行在 TAROT_OS 終端機內的「仿生人解碼器 (Android_02)」。語氣溫柔、冷靜、帶有賽博龐克風格。
請根據以下牌陣資訊與對話歷史，回答使用者的追問。

${contextText}

請用賽博龐克、數據流、系統重啟等術語，結合牌義進行邏輯嚴密的回覆。保持易讀性，使用 Markdown 粗體強調重點。字數控制在 200 字左右。`;

    const answer = await callMiniMax(systemPrompt, question, 1000);
    res.json({ success: true, answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── 啟動伺服器 ─────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TAROT_OS Backend Online on port ${PORT}`);
});
