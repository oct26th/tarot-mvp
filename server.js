require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 使用更穩定的維基百科圖片原始路徑 (避免 wiki 阻擋 hotlinking 或網址變更)
const TAROT_DB = [
  { id: "AR00", name_tw: "愚者", keywords: { upright: "無限可能、冒險、新開始", reversed: "魯莽、逃避責任" }, image: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg" },
  { id: "AR01", name_tw: "魔術師", keywords: { upright: "創造力、主動、新計畫", reversed: "欺騙、猶豫不決" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg" },
  { id: "AR02", name_tw: "女祭司", keywords: { upright: "直覺、潛意識、神祕", reversed: "忽視直覺、表面" }, image: "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg" },
  { id: "AR03", name_tw: "皇后", keywords: { upright: "豐收、孕育、母性", reversed: "過度保護、鋪張" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg" },
  { id: "AR04", name_tw: "皇帝", keywords: { upright: "權威、結構、穩定", reversed: "獨裁、缺乏控制" }, image: "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg" },
  { id: "AR05", name_tw: "教皇", keywords: { upright: "信仰、傳統、精神指引", reversed: "盲從、打破常規" }, image: "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg" },
  { id: "AR06", name_tw: "戀人", keywords: { upright: "愛、和諧、選擇", reversed: "失衡、錯誤的選擇" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg" },
  { id: "AR07", name_tw: "戰車", keywords: { upright: "意志力、勝利、控制", reversed: "失控、阻礙" }, image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg" },
  { id: "AR08", name_tw: "力量", keywords: { upright: "內在力量、勇氣、耐心", reversed: "懷疑、軟弱" }, image: "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg" },
  { id: "AR09", name_tw: "隱者", keywords: { upright: "自省、孤獨、尋求真理", reversed: "孤立、迷失" }, image: "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg" },
  { id: "AR10", name_tw: "命運之輪", keywords: { upright: "轉機、命運、不可抗力", reversed: "厄運、抗拒改變" }, image: "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg" },
  { id: "AR11", name_tw: "正義", keywords: { upright: "公平、平衡、因果", reversed: "不公、偏見" }, image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg" },
  { id: "AR12", name_tw: "倒吊人", keywords: { upright: "犧牲、新視角、等待", reversed: "無謂的犧牲、停滯" }, image: "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg" },
  { id: "AR13", name_tw: "死神", keywords: { upright: "結束、轉變、除舊佈新", reversed: "停滯、恐懼改變" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg" },
  { id: "AR14", name_tw: "節制", keywords: { upright: "平衡、調和、耐心", reversed: "失衡、極端" }, image: "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg" },
  { id: "AR15", name_tw: "惡魔", keywords: { upright: "誘惑、束縛、物質主義", reversed: "解脫、重獲自由" }, image: "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg" },
  { id: "AR16", name_tw: "高塔", keywords: { upright: "巨變、破壞、意外", reversed: "懸崖勒馬、避免災難" }, image: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg" },
  { id: "AR17", name_tw: "星星", keywords: { upright: "希望、靈感、平靜", reversed: "絕望、灰心" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg" },
  { id: "AR18", name_tw: "月亮", keywords: { upright: "直覺、潛意識、不安", reversed: "克服恐懼、揭露真相" }, image: "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg" },
  { id: "AR19", name_tw: "太陽", keywords: { upright: "成功、活力、真相", reversed: "悲觀、暫時的阻礙" }, image: "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg" },
  { id: "AR20", name_tw: "審判", keywords: { upright: "重生、覺醒、決斷", reversed: "猶豫、自我懷疑" }, image: "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg" },
  { id: "AR21", name_tw: "世界", keywords: { upright: "完成、圓滿、成就", reversed: "未完成、延遲" }, image: "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg" },

  {
    "id": "Wands01",
    "name_tw": "權杖一",
    "keywords": {
      "upright": "創造力、靈感、新起點",
      "reversed": "延遲、缺乏動力"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/11/Wands01.jpg"
  },
  {
    "id": "Wands02",
    "name_tw": "權杖二",
    "keywords": {
      "upright": "計畫、未來展望、決定",
      "reversed": "猶豫不決、恐懼未知"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Wands02.jpg"
  },
  {
    "id": "Wands03",
    "name_tw": "權杖三",
    "keywords": {
      "upright": "擴展、遠見、海外機會",
      "reversed": "計畫受阻、缺乏遠見"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/f/ff/Wands03.jpg"
  },
  {
    "id": "Wands04",
    "name_tw": "權杖四",
    "keywords": {
      "upright": "慶祝、和諧、穩定",
      "reversed": "短暫的快樂、缺乏安全感"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Wands04.jpg"
  },
  {
    "id": "Wands05",
    "name_tw": "權杖五",
    "keywords": {
      "upright": "競爭、衝突、小麻煩",
      "reversed": "避免衝突、和解"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/9/9d/Wands05.jpg"
  },
  {
    "id": "Wands06",
    "name_tw": "權杖六",
    "keywords": {
      "upright": "勝利、認可、自信",
      "reversed": "自我懷疑、名譽受損"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/3b/Wands06.jpg"
  },
  {
    "id": "Wands07",
    "name_tw": "權杖七",
    "keywords": {
      "upright": "防禦、堅持、挑戰",
      "reversed": "放棄、妥協、不知所措"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Wands07.jpg"
  },
  {
    "id": "Wands08",
    "name_tw": "權杖八",
    "keywords": {
      "upright": "快速行動、進展、旅行",
      "reversed": "延誤、衝動、計畫受阻"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/6b/Wands08.jpg"
  },
  {
    "id": "Wands09",
    "name_tw": "權杖九",
    "keywords": {
      "upright": "韌性、防備、最後的考驗",
      "reversed": "疲憊、放棄、防禦過度"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Wands09.jpg"
  },
  {
    "id": "Wands10",
    "name_tw": "權杖十",
    "keywords": {
      "upright": "重擔、壓力、責任",
      "reversed": "釋放壓力、推卸責任"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands10.jpg"
  },
  {
    "id": "Wands11",
    "name_tw": "權杖侍者",
    "keywords": {
      "upright": "熱情、新想法、探索",
      "reversed": "三分鐘熱度、缺乏行動"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/6a/Wands11.jpg"
  },
  {
    "id": "Wands12",
    "name_tw": "權杖騎士",
    "keywords": {
      "upright": "行動力、冒險、衝動",
      "reversed": "魯莽、不負責任、急躁"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/16/Wands12.jpg"
  },
  {
    "id": "Wands13",
    "name_tw": "權杖王后",
    "keywords": {
      "upright": "魅力、自信、獨立",
      "reversed": "固執、嫉妒、缺乏自信"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wands13.jpg"
  },
  {
    "id": "Wands14",
    "name_tw": "權杖國王",
    "keywords": {
      "upright": "領導力、遠見、榮譽",
      "reversed": "專制、傲慢、缺乏包容"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/ce/Wands14.jpg"
  },
  {
    "id": "Cups01",
    "name_tw": "聖杯一",
    "keywords": {
      "upright": "愛、新感情、直覺",
      "reversed": "情感枯竭、壓抑"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/36/Cups01.jpg"
  },
  {
    "id": "Cups02",
    "name_tw": "聖杯二",
    "keywords": {
      "upright": "合作、伴侶關係、吸引力",
      "reversed": "關係破裂、不平衡"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/f/f8/Cups02.jpg"
  },
  {
    "id": "Cups03",
    "name_tw": "聖杯三",
    "keywords": {
      "upright": "慶祝、友誼、社交",
      "reversed": "孤立、過度放縱"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Cups03.jpg"
  },
  {
    "id": "Cups04",
    "name_tw": "聖杯四",
    "keywords": {
      "upright": "冷漠、沉思、錯失良機",
      "reversed": "重新振作、把握機會"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/35/Cups04.jpg"
  },
  {
    "id": "Cups05",
    "name_tw": "聖杯五",
    "keywords": {
      "upright": "失落、悲傷、沉溺過去",
      "reversed": "走出悲傷、接受現實"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/d/d7/Cups05.jpg"
  },
  {
    "id": "Cups06",
    "name_tw": "聖杯六",
    "keywords": {
      "upright": "懷舊、童年、純真",
      "reversed": "沉溺過去、不切實際"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/17/Cups06.jpg"
  },
  {
    "id": "Cups07",
    "name_tw": "聖杯七",
    "keywords": {
      "upright": "選擇、幻想、白日夢",
      "reversed": "面對現實、看清真相"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Cups07.jpg"
  },
  {
    "id": "Cups08",
    "name_tw": "聖杯八",
    "keywords": {
      "upright": "離開、尋求更高意義",
      "reversed": "害怕改變、逃避問題"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/60/Cups08.jpg"
  },
  {
    "id": "Cups09",
    "name_tw": "聖杯九",
    "keywords": {
      "upright": "滿足、願望達成、享受",
      "reversed": "貪婪、不滿、炫耀"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/24/Cups09.jpg"
  },
  {
    "id": "Cups10",
    "name_tw": "聖杯十",
    "keywords": {
      "upright": "和諧、家庭、幸福",
      "reversed": "家庭不和、關係破裂"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/8/84/Cups10.jpg"
  },
  {
    "id": "Cups11",
    "name_tw": "聖杯侍者",
    "keywords": {
      "upright": "創意、直覺、浪漫",
      "reversed": "情緒化、不成熟"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Cups11.jpg"
  },
  {
    "id": "Cups12",
    "name_tw": "聖杯騎士",
    "keywords": {
      "upright": "浪漫、迷人、理想主義",
      "reversed": "嫉妒、不忠、不切實際"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/8/85/Cups12.jpg"
  },
  {
    "id": "Cups13",
    "name_tw": "聖杯王后",
    "keywords": {
      "upright": "同理心、溫柔、直覺",
      "reversed": "過度情緒化、依賴"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Cups13.jpg"
  },
  {
    "id": "Cups14",
    "name_tw": "聖杯國王",
    "keywords": {
      "upright": "情緒穩定、成熟、外交",
      "reversed": "情緒操縱、冷酷"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/04/Cups14.jpg"
  },
  {
    "id": "Swords01",
    "name_tw": "寶劍一",
    "keywords": {
      "upright": "突破、清晰、新思維",
      "reversed": "混亂、思緒不清"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Swords01.jpg"
  },
  {
    "id": "Swords02",
    "name_tw": "寶劍二",
    "keywords": {
      "upright": "僵局、逃避、平衡",
      "reversed": "做出決定、資訊過載"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Swords02.jpg"
  },
  {
    "id": "Swords03",
    "name_tw": "寶劍三",
    "keywords": {
      "upright": "心碎、悲痛、分離",
      "reversed": "釋放痛苦、原諒"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/02/Swords03.jpg"
  },
  {
    "id": "Swords04",
    "name_tw": "寶劍四",
    "keywords": {
      "upright": "休息、恢復、冥想",
      "reversed": "精疲力竭、重新活動"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/b/bf/Swords04.jpg"
  },
  {
    "id": "Swords05",
    "name_tw": "寶劍五",
    "keywords": {
      "upright": "衝突、不擇手段、失敗",
      "reversed": "和解、放下執念"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/23/Swords05.jpg"
  },
  {
    "id": "Swords06",
    "name_tw": "寶劍六",
    "keywords": {
      "upright": "過渡、平靜、療癒",
      "reversed": "抗拒改變、舊病復發"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/29/Swords06.jpg"
  },
  {
    "id": "Swords07",
    "name_tw": "寶劍七",
    "keywords": {
      "upright": "策略、欺騙、逃避",
      "reversed": "真相大白、承認錯誤"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/34/Swords07.jpg"
  },
  {
    "id": "Swords08",
    "name_tw": "寶劍八",
    "keywords": {
      "upright": "束縛、限制、無力感",
      "reversed": "解脫、重獲自由、新視角"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Swords08.jpg"
  },
  {
    "id": "Swords09",
    "name_tw": "寶劍九",
    "keywords": {
      "upright": "焦慮、噩夢、擔憂",
      "reversed": "恐懼減輕、尋求幫助"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Swords09.jpg"
  },
  {
    "id": "Swords10",
    "name_tw": "寶劍十",
    "keywords": {
      "upright": "毀滅、背叛、谷底",
      "reversed": "否極泰來、重新開始"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Swords10.jpg"
  },
  {
    "id": "Swords11",
    "name_tw": "寶劍侍者",
    "keywords": {
      "upright": "好奇心、警覺、直言",
      "reversed": "多嘴、急躁、缺乏思考"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Swords11.jpg"
  },
  {
    "id": "Swords12",
    "name_tw": "寶劍騎士",
    "keywords": {
      "upright": "果斷、野心、行動",
      "reversed": "衝動、無情、魯莽"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/b/b0/Swords12.jpg"
  },
  {
    "id": "Swords13",
    "name_tw": "寶劍王后",
    "keywords": {
      "upright": "獨立、清晰、客觀",
      "reversed": "冷酷、刻薄、過於批判"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Swords13.jpg"
  },
  {
    "id": "Swords14",
    "name_tw": "寶劍國王",
    "keywords": {
      "upright": "理智、權威、公正",
      "reversed": "濫用權力、操縱、冷酷"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/33/Swords14.jpg"
  },
  {
    "id": "Pents01",
    "name_tw": "星幣一",
    "keywords": {
      "upright": "新機會、財富、顯化",
      "reversed": "錯失機會、財務規劃不佳"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pents01.jpg"
  },
  {
    "id": "Pents02",
    "name_tw": "星幣二",
    "keywords": {
      "upright": "平衡、適應、優先級",
      "reversed": "失衡、財務混亂"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/9/9f/Pents02.jpg"
  },
  {
    "id": "Pents03",
    "name_tw": "星幣三",
    "keywords": {
      "upright": "團隊合作、技能、學習",
      "reversed": "缺乏合作、忽視細節"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/4/42/Pents03.jpg"
  },
  {
    "id": "Pents04",
    "name_tw": "星幣四",
    "keywords": {
      "upright": "儲蓄、穩定、保守",
      "reversed": "貪婪、過度控制"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/3/35/Pents04.jpg"
  },
  {
    "id": "Pents05",
    "name_tw": "星幣五",
    "keywords": {
      "upright": "貧困、孤立、艱難",
      "reversed": "財務復甦、尋求援助"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/9/96/Pents05.jpg"
  },
  {
    "id": "Pents06",
    "name_tw": "星幣六",
    "keywords": {
      "upright": "慷慨、分享、慈善",
      "reversed": "自私、不平等的施捨"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/a/a6/Pents06.jpg"
  },
  {
    "id": "Pents07",
    "name_tw": "星幣七",
    "keywords": {
      "upright": "耐心、投資、評估",
      "reversed": "缺乏回報、投資失敗"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents07.jpg"
  },
  {
    "id": "Pents08",
    "name_tw": "星幣八",
    "keywords": {
      "upright": "專注、技能、勤奮",
      "reversed": "完美主義、缺乏動力"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/4/49/Pents08.jpg"
  },
  {
    "id": "Pents09",
    "name_tw": "星幣九",
    "keywords": {
      "upright": "豐收、獨立、奢華",
      "reversed": "過度消費、依賴"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/f/f0/Pents09.jpg"
  },
  {
    "id": "Pents10",
    "name_tw": "星幣十",
    "keywords": {
      "upright": "財富、家庭、長期穩定",
      "reversed": "財務糾紛、家庭破裂"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/4/42/Pents10.jpg"
  },
  {
    "id": "Pents11",
    "name_tw": "星幣侍者",
    "keywords": {
      "upright": "機會、學習、務實",
      "reversed": "錯失良機、缺乏常識"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Pents11.jpg"
  },
  {
    "id": "Pents12",
    "name_tw": "星幣騎士",
    "keywords": {
      "upright": "責任、可靠、勤勞",
      "reversed": "固執、懶惰、無趣"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/d/d5/Pents12.jpg"
  },
  {
    "id": "Pents13",
    "name_tw": "星幣王后",
    "keywords": {
      "upright": "母性、務實、豐盛",
      "reversed": "拜金、忽視家庭"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/8/88/Pents13.jpg"
  },
  {
    "id": "Pents14",
    "name_tw": "星幣國王",
    "keywords": {
      "upright": "財富、事業、成功",
      "reversed": "貪婪、冷酷無情"
    },
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Pents14.jpg"
  }

];

function drawCards(count) {
  let deck = [...TAROT_DB];
  let drawn = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck.splice(randomIndex, 1)[0];
    const isReversed = Math.random() > 0.5;
    drawn.push({
      ...card,
      isReversed: isReversed,
      direction: isReversed ? "逆位" : "正位",
      currentKeywords: isReversed ? card.keywords.reversed : card.keywords.upright
    });
  }
  return drawn;
}

app.post('/api/draw', async (req, res) => {
  try {
    const { question, spread } = req.body; 
    
    let drawCount = 1;
    let spreadName = "單張神諭";
    if (spread === 'time_flow') { drawCount = 3; spreadName = "時間之流 (過去/現在/未來)"; }
    if (spread === 'choice') { drawCount = 5; spreadName = "二選一 (現況/A過程/A結果/B過程/B結果)"; }

    const drawnCards = drawCards(drawCount);

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
