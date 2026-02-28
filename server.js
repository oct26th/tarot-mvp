require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 擴充至完整的 22 張大阿爾克那 (MVP 階段夠用了，後續可再補 56 張小阿爾克那)
const TAROT_DB = [
  { id: "AR00", name_tw: "愚者", keywords: { upright: "無限可能、冒險、新開始", reversed: "魯莽、逃避責任" } },
  { id: "AR01", name_tw: "魔術師", keywords: { upright: "創造力、主動、新計畫", reversed: "欺騙、猶豫不決" } },
  { id: "AR02", name_tw: "女祭司", keywords: { upright: "直覺、潛意識、神祕", reversed: "忽視直覺、表面" } },
  { id: "AR03", name_tw: "皇后", keywords: { upright: "豐收、孕育、母性", reversed: "過度保護、鋪張" } },
  { id: "AR04", name_tw: "皇帝", keywords: { upright: "權威、結構、穩定", reversed: "獨裁、缺乏控制" } },
  { id: "AR05", name_tw: "教皇", keywords: { upright: "信仰、傳統、精神指引", reversed: "盲從、打破常規" } },
  { id: "AR06", name_tw: "戀人", keywords: { upright: "愛、和諧、選擇", reversed: "失衡、錯誤的選擇" } },
  { id: "AR07", name_tw: "戰車", keywords: { upright: "意志力、勝利、控制", reversed: "失控、阻礙" } },
  { id: "AR08", name_tw: "力量", keywords: { upright: "內在力量、勇氣、耐心", reversed: "懷疑、軟弱" } },
  { id: "AR09", name_tw: "隱者", keywords: { upright: "自省、孤獨、尋求真理", reversed: "孤立、迷失" } },
  { id: "AR10", name_tw: "命運之輪", keywords: { upright: "轉機、命運、不可抗力", reversed: "厄運、抗拒改變" } },
  { id: "AR11", name_tw: "正義", keywords: { upright: "公平、平衡、因果", reversed: "不公、偏見" } },
  { id: "AR12", name_tw: "倒吊人", keywords: { upright: "犧牲、新視角、等待", reversed: "無謂的犧牲、停滯" } },
  { id: "AR13", name_tw: "死神", keywords: { upright: "結束、轉變、除舊佈新", reversed: "停滯、恐懼改變" } },
  { id: "AR14", name_tw: "節制", keywords: { upright: "平衡、調和、耐心", reversed: "失衡、極端" } },
  { id: "AR15", name_tw: "惡魔", keywords: { upright: "誘惑、束縛、物質主義", reversed: "解脫、重獲自由" } },
  { id: "AR16", name_tw: "高塔", keywords: { upright: "巨變、破壞、意外", reversed: "懸崖勒馬、避免災難" } },
  { id: "AR17", name_tw: "星星", keywords: { upright: "希望、靈感、平靜", reversed: "絕望、灰心" } },
  { id: "AR18", name_tw: "月亮", keywords: { upright: "直覺、潛意識、不安", reversed: "克服恐懼、揭露真相" } },
  { id: "AR19", name_tw: "太陽", keywords: { upright: "成功、活力、真相", reversed: "悲觀、暫時的阻礙" } },
  { id: "AR20", name_tw: "審判", keywords: { upright: "重生、覺醒、決斷", reversed: "猶豫、自我懷疑" } },
  { id: "AR21", name_tw: "世界", keywords: { upright: "完成、圓滿、成就", reversed: "未完成、延遲" } }
];

// 洗牌與抽牌函數 (不重複)
function drawCards(count) {
  let deck = [...TAROT_DB];
  let drawn = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck.splice(randomIndex, 1)[0];
    const isReversed = Math.random() > 0.5;
    drawn.push({
      ...card,
      direction: isReversed ? "逆位" : "正位",
      currentKeywords: isReversed ? card.keywords.reversed : card.keywords.upright
    });
  }
  return drawn;
}

app.post('/api/draw', async (req, res) => {
  try {
    const { question, spread } = req.body; // spread: 'single', 'time_flow', 'choice'
    
    let drawCount = 1;
    let spreadName = "單張神諭";
    if (spread === 'time_flow') { drawCount = 3; spreadName = "時間之流 (過去/現在/未來)"; }
    if (spread === 'choice') { drawCount = 5; spreadName = "二選一 (現況/A過程/A結果/B過程/B結果)"; }

    const drawnCards = drawCards(drawCount);

    // 建立給 LLM 看的牌陣格式字串
    let cardsPromptText = "";
    if (spread === 'single') {
        cardsPromptText = `抽出的牌：【${drawnCards[0].name_tw}】(${drawnCards[0].direction}) - 涵義：${drawnCards[0].currentKeywords}`;
    } else if (spread === 'time_flow') {
        cardsPromptText = `
        [過去]：【${drawnCards[0].name_tw}】(${drawnCards[0].direction}) - ${drawnCards[0].currentKeywords}
        [現在]：【${drawnCards[1].name_tw}】(${drawnCards[1].direction}) - ${drawnCards[1].currentKeywords}
        [未來]：【${drawnCards[2].name_tw}】(${drawnCards[2].direction}) - ${drawnCards[2].currentKeywords}
        `;
    } else if (spread === 'choice') {
        cardsPromptText = `
        [現況]：【${drawnCards[0].name_tw}】(${drawnCards[0].direction}) - ${drawnCards[0].currentKeywords}
        [選擇A-過程]：【${drawnCards[1].name_tw}】(${drawnCards[1].direction}) - ${drawnCards[1].currentKeywords}
        [選擇A-結果]：【${drawnCards[2].name_tw}】(${drawnCards[2].direction}) - ${drawnCards[2].currentKeywords}
        [選擇B-過程]：【${drawnCards[3].name_tw}】(${drawnCards[3].direction}) - ${drawnCards[3].currentKeywords}
        [選擇B-結果]：【${drawnCards[4].name_tw}】(${drawnCards[4].direction}) - ${drawnCards[4].currentKeywords}
        `;
    }

    const systemPrompt = `你是一個運行在 TAROT_OS 終端機內的「仿生人解碼器 (Android_02)」。語氣溫柔、冷靜、帶有賽博龐克風格。
使用者問題：${question || '未提供，請求系統預設掃描'}。
使用的牌陣陣型：${spreadName}。
${cardsPromptText}

請用賽博龐克、數據流、系統重啟等術語，結合標準牌義進行邏輯嚴密的解讀。如果有多張牌，請說明它們之間的因果與數據流向。保持易讀性，使用 Markdown 粗體強調重點。字數控制在 300 字左右。`;

    // MiniMax Anthropic API call
    const response = await fetch('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'minimax-2.5',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: '開始解碼。' }]
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`MiniMax API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    
    let interpretationText = '';
    if (data && data.content && Array.isArray(data.content)) {
        const textElement = data.content.find(item => item.text);
        if (textElement && textElement.text) {
            interpretationText = textElement.text;
        } else {
            interpretationText = JSON.stringify(data.content);
        }
    } else {
        interpretationText = JSON.stringify(data);
    }

    // Convert newlines to HTML breaks for display
    interpretationText = interpretationText.replace(/\n/g, '<br/>');

    res.json({
      success: true,
      cards: drawnCards,
      spread,
      interpretation: interpretationText
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TAROT_OS Backend Online on port ${PORT}`);
});
