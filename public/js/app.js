// Update Time & Coords for realism
setInterval(() => {
    const now = new Date();
    document.getElementById('live-time').textContent = 'UTC ' + now.toISOString().replace('T', ' ').substring(0, 19);
    // Subtle jitter for coordinates
    const lat = (35.6895 + (Math.random() - 0.5) * 0.001).toFixed(4);
    const lng = (139.6917 + (Math.random() - 0.5) * 0.001).toFixed(4);
    document.getElementById('live-coords').textContent = `LAT: ${lat} | LNG: ${lng}`;
}, 1000);

function parseMarkdown(text) {
    if (!text) return '';
    // 轉義 HTML 標籤
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 解析標題 (###)
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-blue-400 font-bold mt-4 mb-2 border-b border-blue-500/20 pb-1">$1</h3>');

    // 解析粗體 (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white border-b border-blue-500/30 font-bold">$1</strong>');

    // 解析清單 (- text)
    html = html.replace(/^\- (.*$)/gim, '<div class="flex items-start gap-2 my-1"><span class="text-blue-500 mt-1">▶</span><span>$1</span></div>');

    // 解析換行
    html = html.replace(/\n/g, '<br/>');

    return html;
}

// 追問功能相關變數
let followUpCount = 0;
const MAX_FOLLOW_UPS = 3;
let conversationHistory = [];
let originalContextData = null;

// 更新追問計數器顯示
function updateFollowUpCounter() {
    const remaining = MAX_FOLLOW_UPS - followUpCount;
    document.getElementById('query-count').textContent = remaining;

    const input = document.getElementById('follow-up-input');
    if (remaining <= 0) {
        input.disabled = true;
        input.placeholder = '追問次數已用盡 // QUERY_LIMIT_REACHED';
        document.getElementById('follow-up-counter').classList.add('opacity-30');
    }
}

// 顯示追問區域
function showFollowUpSection(cards, spread) {
    const section = document.getElementById('follow-up-section');
    section.classList.remove('hidden');

    // 記錄原始牌陣資訊
    let contextText = '';
    if (spread === 'single') {
        contextText = `【${cards[0].name_tw}】(${cards[0].direction}) - ${cards[0].currentKeywords}`;
    } else if (spread === 'time_flow') {
        contextText = `[過去]: ${cards[0].name_tw} (${cards[0].direction}) - ${cards[0].currentKeywords}\n[現在]: ${cards[1].name_tw} (${cards[1].direction}) - ${cards[1].currentKeywords}\n[未來]: ${cards[2].name_tw} (${cards[2].direction}) - ${cards[2].currentKeywords}`;
    } else if (spread === 'choice') {
        contextText = `[現況]: ${cards[0].name_tw} (${cards[0].direction}) - ${cards[0].currentKeywords}\n[選擇A]: ${cards[1].name_tw} / ${cards[2].name_tw}\n[選擇B]: ${cards[3].name_tw} / ${cards[4].name_tw}`;
    }

    originalContextData = contextText;
    followUpCount = 0;
    conversationHistory = [];
    updateFollowUpCounter();

    const input = document.getElementById('follow-up-input');
    input.disabled = false;
    input.placeholder = '輸入追問內容... (例如: 這張牌的逆位含義？)';
    document.getElementById('follow-up-counter').classList.remove('opacity-30');
}

// 處理追問
async function handleFollowUp() {
    const input = document.getElementById('follow-up-input');
    const question = input.value.trim();

    if (!question || followUpCount >= MAX_FOLLOW_UPS) return;

    // 禁用輸入
    input.disabled = true;

    // 加入使用者問題到歷史
    conversationHistory.push({ role: 'user', content: question });

    // 顯示使用者輸入（像終端機 Log）
    const logContainer = document.getElementById('follow-up-log');
    const userLog = document.createElement('div');
    userLog.className = 'text-green-500/80 border-l-2 border-green-500/30 pl-3 py-1';
    userLog.innerHTML = `<span class="opacity-50">[${new Date().toLocaleTimeString()}]</span> USER_QUERY: ${question}`;
    logContainer.appendChild(userLog);

    // 清空輸入
    input.value = '';

    // 顯示載入中
    const loadingLog = document.createElement('div');
    loadingLog.className = 'text-blue-400/60 py-2';
    loadingLog.id = 'follow-up-loading';
    loadingLog.innerHTML = '<span class="animate-pulse">▌ PROCESSING_QUERY...</span>';
    logContainer.appendChild(loadingLog);

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: conversationHistory,
                question: question,
                originalContext: originalContextData
            })
        });

        const data = await response.json();

        // 移除載入中
        document.getElementById('follow-up-loading').remove();

        if (data.success) {
            // 加入系統回覆到歷史
            conversationHistory.push({ role: 'assistant', content: data.answer });

            // 顯示系統回覆（像終端機 Log）
            const sysLog = document.createElement('div');
            sysLog.className = 'text-white/80 border-l-2 border-blue-500/50 pl-3 py-2 bg-blue-500/5';
            sysLog.innerHTML = `<span class="opacity-50 text-[10px] block mb-1">[${new Date().toLocaleTimeString()}] SYSTEM_REPLY:</span><div class="font-mono">${parseMarkdown(data.answer)}</div>`;
            logContainer.appendChild(sysLog);

            // 更新計數器
            followUpCount++;
            updateFollowUpCounter();

            // 滾動到最新回覆
            logContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('SYSTEM_ERROR: ' + data.error);
        }
    } catch (err) {
        document.getElementById('follow-up-loading').remove();
        alert('CONNECTION_FAILED');
    }

    // 恢復輸入
    if (followUpCount < MAX_FOLLOW_UPS) {
        input.disabled = false;
        input.focus();
    }
}

// 綁定 Enter 鍵事件
document.getElementById('follow-up-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleFollowUp();
    }
});

async function drawCard(spreadType) {
    const question = document.getElementById('question').value;
    const buttons = document.querySelectorAll('button');
    const resultBox = document.getElementById('result-box');
    const loading = document.getElementById('loading');

    buttons.forEach(btn => { btn.disabled = true; btn.classList.add('opacity-30', 'cursor-not-allowed'); });
    resultBox.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        // Step 1: Draw cards instantly
        const drawResponse = await fetch('/api/draw_cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spread: spreadType })
        });
        const drawData = await drawResponse.json();

        if (!drawData.success) {
            alert('SYSTEM_ERROR: ' + drawData.error);
            return;
        }

        // Show cards
        const container = document.getElementById('cards-container');
        container.innerHTML = '';

        if (spreadType === 'single') container.className = 'grid grid-cols-1 max-w-sm mx-auto gap-8';
        if (spreadType === 'time_flow') container.className = 'grid grid-cols-1 md:grid-cols-3 gap-6';
        if (spreadType === 'choice') container.className = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4';

        const getLabel = (spread, index) => {
            if (spread === 'single') return '神諭核心 (CORE)';
            if (spread === 'time_flow') return ['過去 (PAST)', '現在 (PRESENT)', '未來 (FUTURE)'][index];
            if (spread === 'choice') return ['現況 (AXIS)', '選擇A-過程 (ALPHA_P)', '選擇A-結果 (ALPHA_R)', '選擇B-過程 (BETA_P)', '選擇B-結果 (BETA_R)'][index];
        };

        drawData.cards.forEach((card, index) => {
            const imgRotationClass = card.isReversed ? 'reversed-card' : '';
            const accentColor = card.isReversed ? 'text-red-400' : 'text-blue-400';

            const cardHtml = `
                <div class="card-frame p-4 bg-[#0f1114]/50 flex flex-col group animate-in fade-in zoom-in duration-500" style="animation-delay: ${index * 150}ms; animation-fill-mode: backwards;">
                    <div class="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                        <span class="text-[9px] tracking-tighter opacity-40">POS_${index.toString().padStart(2, '0')}</span>
                        <span class="text-[9px] font-bold tracking-widest text-white/60">${getLabel(spreadType, index)}</span>
                    </div>
                    
                    <div class="mb-4 bg-black overflow-hidden border border-white/5">
                        <img src="${card.image}" alt="${card.name_tw}" class="w-full object-cover aspect-[1/1.7] ${imgRotationClass} group-hover:scale-105 transition-all duration-700">
                    </div>
                    
                    <div class="mt-auto">
                        <h3 class="text-lg font-bold tracking-widest text-white leading-tight uppercase">${card.name_tw}</h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-1 h-1 ${card.isReversed ? 'bg-red-500' : 'bg-blue-500'}"></span>
                            <p class="text-[10px] font-bold tracking-widest ${accentColor} opacity-80 uppercase">${card.direction}</p>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHtml;
        });

        const interpEl = document.getElementById('interpretation');
        interpEl.innerHTML = `<span class="animate-pulse text-blue-400 font-mono text-sm">▌ DECRYPTING_INTEL_REPORT...</span>`;

        loading.classList.add('hidden');
        resultBox.classList.remove('hidden');
        resultBox.scrollIntoView({ behavior: 'smooth' });

        // Hide follow-up section initially
        document.getElementById('follow-up-section').classList.add('hidden');

        // Step 2: Request interpretation
        const interpResponse = await fetch('/api/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, spread: spreadType, spreadName: drawData.spreadName, cards: drawData.cards })
        });
        const interpData = await interpResponse.json();

        if (interpData.success) {
            const formattedText = parseMarkdown(interpData.interpretation);
            interpEl.innerHTML = `<div class="font-mono space-y-4 opacity-90">${formattedText}</div><span class="cursor"></span>`;

            // 顯示追問區域
            showFollowUpSection(drawData.cards, spreadType);
        } else {
            interpEl.innerHTML = `<span class="text-red-500">SYSTEM_ERROR: ${interpData.error}</span>`;
        }

    } catch (err) {
        alert('CONNECTION_FAILED');
    } finally {
        buttons.forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-30', 'cursor-not-allowed'); });
    }
}
