// =====================================
// 東京ビッグサイト イベント案内AI
// script.js - ver_local
// =====================================

const uid = 'user-' + Math.random().toString(36).substr(2, 9);

const INITIAL_QUICK_REPLIES = [
    '今週開催中のイベント',
    '一般向けイベントを探す',
    'IT・DX系のイベント',
    'ファッション・アパレル系',
    '無料で入れるイベント'
];

const chatMessages   = document.getElementById('chatMessages');
const resultsGrid    = document.getElementById('resultsGrid');
const resultsTitle   = document.getElementById('resultsTitle');
const resultsCount   = document.getElementById('resultsCount');
const emptyState     = document.getElementById('emptyState');
const quickReplyArea = document.getElementById('quickReplyArea');
const userInput      = document.getElementById('userInput');
const sendBtn        = document.getElementById('sendBtn');

// =====================================
// 初期化
// =====================================
window.addEventListener('load', () => {
    addAIMessage('こんにちは！東京ビッグサイトで開催されるイベントを案内します。\nどんなイベントをお探しですか？', null);
    renderQuickReplies(INITIAL_QUICK_REPLIES);
});

// =====================================
// メッセージ送信
// =====================================
async function sendMessage(text) {
    const message = (text || userInput.value).trim();
    if (!message) return;

    userInput.value = '';
    addUserMessage(message);
    clearQuickReplies();

    const loadingEl = addLoadingMessage();

    try {
        const data = await callAPI(message);
        loadingEl.remove();

        const { plainText, extension } = parseResponse(data.response);
        addAIMessage(plainText, extension);

        const followups = (extension && extension.followups && extension.followups.length > 0)
            ? extension.followups
            : INITIAL_QUICK_REPLIES;
        renderQuickReplies(followups);

    } catch (e) {
        loadingEl.remove();
        console.error('API Error:', e);
        addAIMessage('エラーが発生しました。もう一度お試しください。', null);
        renderQuickReplies(INITIAL_QUICK_REPLIES);
    }
}

// =====================================
// API呼び出し（直接miibo）
// =====================================
async function callAPI(message) {
    const response = await fetch('https://api-mebo.dev/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key:  MEBO_API_KEY,
            agent_id: MEBO_AGENT_ID,
            utterance: message,
            uid: uid
        })
    });
    if (!response.ok) throw new Error('API error: ' + response.status);
    const data = await response.json();
    if (!data.bestResponse || !data.bestResponse.utterance) throw new Error('Invalid response');
    return { response: data.bestResponse.utterance };
}

// =====================================
// Extensionパース
// =====================================
function parseResponse(text) {
    const match     = text.match(/```extension\s*([\s\S]*?)```/);
    const plainText = text.replace(/```extension[\s\S]*?```/g, '').replace(/\n{2,}/g, '\n').trim();
    let extension   = null;
    if (match) {
        try { extension = JSON.parse(match[1].trim()); }
        catch (e) { console.warn('Extension parse error:', e); }
    }
    return { plainText, extension };
}

// =====================================
// チャットUI描画
// =====================================
function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addAIMessage(text, extension) {
    // テキストはチャットパネルへ
    if (text) {
        const div = document.createElement('div');
        div.className = 'message ai-message';
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // イベントカードは右パネルへ
    if (extension && extension.type === 'show_events') {
        updateResultsPanel(extension);
    }
}

function addLoadingMessage() {
    const div = document.createElement('div');
    div.className = 'loading';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// =====================================
// 右パネル：検索結果
// =====================================
function updateResultsPanel(extension) {
    const events = Array.isArray(extension.events) ? extension.events : [];

    // グリッドをクリア
    resultsGrid.innerHTML = '';

    if (events.length === 0) {
        // 見つからなかった
        showEmptyState();
        resultsTitle.textContent = '検索結果';
        resultsCount.textContent = '0件';
        return;
    }

    // エンプティ非表示・グリッド表示
    emptyState.style.display = 'none';
    resultsGrid.style.display = 'grid';

    resultsTitle.textContent = '検索結果';
    resultsCount.textContent = `${events.length}件`;

    events.forEach(event => resultsGrid.appendChild(createEventCard(event)));
}

function showEmptyState() {
    resultsGrid.style.display = 'none';
    emptyState.style.display  = 'flex';
}

// =====================================
// イベントカード生成
// =====================================
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    // アクセントバー
    const accent = document.createElement('div');
    accent.className = 'event-card-accent';
    card.appendChild(accent);

    // 展示会名
    const name = document.createElement('div');
    name.className = 'event-name';
    name.textContent = event.name || '';
    card.appendChild(name);

    // 基本情報
    const meta = document.createElement('div');
    meta.className = 'event-meta';
    [
        { icon: '📅', value: event.period },
        { icon: '📍', value: event.venue },
        { icon: '👥', value: event.target },
        { icon: '🎫', value: event.admission }
    ].forEach(({ icon, value }) => {
        if (value) {
            const item = document.createElement('div');
            item.className = 'event-meta-item';
            item.textContent = icon + ' ' + value;
            meta.appendChild(item);
        }
    });
    card.appendChild(meta);

    // 概要説明
    if (event.description) {
        const desc = document.createElement('div');
        desc.className = 'event-description';
        desc.textContent = event.description;
        card.appendChild(desc);
    }

    // 同時開催・専門展一覧
    if (Array.isArray(event.sub_events) && event.sub_events.length > 0) {
        const subWrap = document.createElement('div');
        subWrap.className = 'event-sub';

        const subTitle = document.createElement('div');
        subTitle.className = 'event-sub-title';
        subTitle.textContent = '同時開催の専門展';
        subWrap.appendChild(subTitle);

        const subList = document.createElement('ul');
        subList.className = 'event-sub-list';
        event.sub_events.forEach(subName => {
            const li = document.createElement('li');
            li.textContent = subName;
            subList.appendChild(li);
        });
        subWrap.appendChild(subList);
        card.appendChild(subWrap);
    }

    // リンク
    if (event.url) {
        const link = document.createElement('a');
        link.className = 'event-link';
        link.href = event.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = '公式サイトを見る <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
        card.appendChild(link);
    }

    return card;
}

// =====================================
// クイックリプライ
// =====================================
function renderQuickReplies(items) {
    quickReplyArea.innerHTML = '';
    items.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = text;
        btn.addEventListener('click', () => sendMessage(text));
        quickReplyArea.appendChild(btn);
    });
}

function clearQuickReplies() {
    quickReplyArea.innerHTML = '';
}

// =====================================
// イベントリスナー
// =====================================
sendBtn.addEventListener('click', () => sendMessage());
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        sendMessage();
    }
});
