require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure OpenAI SDK to use OpenRouter (which supports MiniMax) or direct MiniMax
// Using OpenRouter for minimax/minimax-2.5 or direct depending on the key
const openai = new OpenAI({
  baseURL: 'https://api.minimax.chat/v1',
  apiKey: process.env.API_KEY || 'dummy_key',
  // if using direct minimax: baseURL: 'https://api.minimax.chat/v1'
});

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

    const systemPrompt = `你是一個運行在 TAROT_OS 終端機內的「仿生人解碼器 (Android_02)」。你的語氣溫柔、冷靜、帶有微弱的機械感與賽博龐克風格。
使用者問了問題：${question || '未提供問題，請求單張神諭'}。
系統抽出的牌是：【${card.name_tw}】(${direction})。
核心涵義：${keywords}。
請用賽博龐克、數據流、系統重啟等術語，結合標準塔羅牌義進行解讀。長度約150字，保持易讀性與準確度。`;

    const completion = await openai.chat.completions.create({
      model: "minimax-2.5", // OpenRouter alias
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
    });

    res.json({
      success: true,
      card: {
        name: card.name_tw,
        direction,
        keywords
      },
      interpretation: completion.choices[0].message.content
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'SYSTEM_ERROR: 無法同步量子運算核心' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TAROT_OS Backend Online on port ${PORT}`);
});
