require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch'); // Zeabur Node 18+ has native fetch, but we can just use native fetch directly

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TAROT_DB = [
  { id: "AR00", name_tw: "愚者", keywords: { upright: "無限可能、冒險、新開始", reversed: "魯莽、逃避責任" } },
  { id: "AR01", name_tw: "魔術師", keywords: { upright: "創造力、主動、新計畫", reversed: "欺騙、猶豫不決" } },
  { id: "AR02", name_tw: "女祭司", keywords: { upright: "直覺、潛意識、神祕", reversed: "忽視直覺、表面" } },
  { id: "AR13", name_tw: "死神", keywords: { upright: "結束、轉變、除舊佈新", reversed: "停滯、恐懼改變" } },
  { id: "AR16", name_tw: "高塔", keywords: { upright: "巨變、破壞、意外", reversed: "懸崖勒馬、避免災難" } }
];

app.post('/api/draw', async (req, res) => {
  try {
    const { question } = req.body;
    
    // Draw 1 random card
    const card = TAROT_DB[Math.floor(Math.random() * TAROT_DB.length)];
    const isReversed = Math.random() > 0.5;
    const direction = isReversed ? "逆位" : "正位";
    const keywords = isReversed ? card.keywords.reversed : card.keywords.upright;

    const systemPrompt = `你是一個運行在 TAROT_OS 終端機內的「仿生人解碼器 (Android_02)」。你的語氣溫柔、冷靜、帶有微弱的機械感與賽博龐克風格。\n使用者問了問題：${question || '未提供問題，請求單張神諭'}。\n系統抽出的牌是：【${card.name_tw}】(${direction})。\n核心涵義：${keywords}。\n請用賽博龐克、數據流、系統重啟等術語，結合標準塔羅牌義進行解讀。長度約150字，保持易讀性與準確度。`;

    // Using MiniMax Global via Anthropic API format
    const response = await fetch('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'minimax-2.5', // Try the standard model name for global
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          { role: 'user', content: '開始解碼。' }
        ]
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`MiniMax API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      card: {
        name: card.name_tw,
        direction,
        keywords
      },
      interpretation: data.content[0].text
    });
  } catch (error) {
    console.error(error);
    // Send the actual error message to the frontend for debugging
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TAROT_OS Backend Online on port ${PORT}`);
});
