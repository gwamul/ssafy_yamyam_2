/* ══════════════════════════════════════════════
   YamYam 얌얌이 Chatbot — 응답 구조 안정화 + Markdown 지원
   - CSS 최대한 유지
   - 응답 구조를 유연하게 파싱
   - timeout 실제 적용
   - 디버깅 로그 추가
══════════════════════════════════════════════ */

(function () {
    'use strict';

    const API_URL = 'http://127.0.0.1:8000/integrated-chat';
    const REQUEST_TIMEOUT_MS = 120000;

    const GREET_MSG = '안녕하세요! 저는 <b>얌얌이</b>예요 🥦<br>식단·영양·챌린지에 대해 뭐든 물어보세요!';

    const CHIPS = [
        { label: '🔥 칼로리', msg: '오늘 칼로리 목표가 얼마예요?' },
        { label: '💪 단백질', msg: '단백질은 하루에 얼마나 먹어야 해요?' },
        { label: '🥗 식단 추천', msg: '다이어트에 좋은 식단을 추천해줘' },
        { label: '🏅 챌린지', msg: '챌린지 어떻게 참여해요?' },
    ];

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildWidget() {
        const fab = document.createElement('button');
        fab.className = 'yy-fab';
        fab.setAttribute('aria-label', '얌얌이 챗봇 열기');
        fab.innerHTML = `
            <span class="yy-fab-open"><i class="fa-solid fa-seedling"></i></span>
            <span class="yy-fab-close"><i class="fa-solid fa-xmark"></i></span>
            <span class="yy-fab-badge"></span>`;

        const win = document.createElement('div');
        win.className = 'yy-window';
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', '얌얌이 챗봇');

        const chipsHTML = CHIPS.map(c =>
            `<button class="yy-chip" data-msg="${escapeHtml(c.msg)}">${c.label}</button>`
        ).join('');

        win.innerHTML = `
            <div class="yy-header">
                <div class="yy-header-left">
                    <div class="yy-avatar">🥦</div>
                    <div>
                        <div class="yy-name">얌얌이</div>
                        <div class="yy-status"><span class="yy-dot"></span>AI 영양사</div>
                    </div>
                </div>
                <button class="yy-close-btn" aria-label="닫기"><i class="fa-solid fa-chevron-down"></i></button>
            </div>

            <div class="yy-chips-row">${chipsHTML}</div>

            <div class="yy-messages" id="yyMessages">
                <div class="yy-msg bot">
                    <div class="yy-msg-av">🥦</div>
                    <div class="yy-msg-body">
                        <div class="yy-bubble yy-bubble-bot">${GREET_MSG}</div>
                    </div>
                </div>
            </div>

            <div class="yy-input-bar">
                <input
                    type="text"
                    class="yy-input"
                    id="yyInput"
                    placeholder="메시지를 입력하세요…"
                    maxlength="300"
                    autocomplete="off">
                <button class="yy-send" id="yySend" aria-label="전송">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>`;

        document.body.appendChild(fab);
        document.body.appendChild(win);
        return { fab, win };
    }

    function appendMsg(container, role, html, source) {
        const wrap = document.createElement('div');
        wrap.className = `yy-msg ${role}`;

        if (role === 'bot') {
            let sourceHTML = '';
            if (source) {
                const sourceText = Array.isArray(source)
                    ? source.map(v => escapeHtml(String(v))).join(', ')
                    : escapeHtml(String(source));

                sourceHTML = `<div class="yy-source-card"><i class="fa-solid fa-book-open"></i> 출처: ${sourceText}</div>`;
            }

            wrap.innerHTML = `
                <div class="yy-msg-av">🥦</div>
                <div class="yy-msg-body">
                    <div class="yy-bubble yy-bubble-bot yy-markdown">${html}</div>
                    ${sourceHTML}
                </div>`;
        } else {
            wrap.innerHTML = `
                <div class="yy-msg-body yy-msg-body-user">
                    <div class="yy-bubble yy-bubble-user">${html}</div>
                </div>`;
        }

        container.appendChild(wrap);
        container.scrollTop = container.scrollHeight;
        return wrap;
    }

    function showTyping(container) {
        const t = document.createElement('div');
        t.className = 'yy-msg bot yy-typing-wrap';
        t.innerHTML = `
            <div class="yy-msg-av">🥦</div>
            <div class="yy-msg-body">
                <div class="yy-bubble yy-bubble-bot yy-typing">
                    <span></span><span></span><span></span>
                </div>
            </div>`;
        container.appendChild(t);
        container.scrollTop = container.scrollHeight;
        return t;
    }

    function extractAnswer(data) {
        console.log('[YamYam] raw response:', data);

        if (data == null) {
            return { answer: '', source: null };
        }

        if (typeof data === 'string') {
            return { answer: data, source: null };
        }

        if (Array.isArray(data)) {
            return {
                answer: data.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n'),
                source: null
            };
        }

        const answer =
            data.answer ??
            data.response ??
            data.result ??
            data.message ??
            data.output ??
            data.data?.answer ??
            data.data?.response ??
            data.data?.result ??
            '';

        const source =
            data.source ??
            data.sources ??
            data.reference ??
            data.references ??
            data.data?.source ??
            data.data?.sources ??
            null;

        return { answer, source };
    }

    async function callRAG(message) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
                signal: controller.signal
            });

            const contentType = res.headers.get('content-type') || '';
            const rawText = await res.text();

            console.log('[YamYam] status:', res.status);
            console.log('[YamYam] raw text:', rawText);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} - ${rawText}`);
            }

            if (contentType.includes('application/json')) {
                try {
                    return JSON.parse(rawText);
                } catch (e) {
                    console.warn('[YamYam] JSON parse failed, fallback to text');
                    return rawText;
                }
            }

            return rawText;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function parseInlineMarkdown(text) {
        return text
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    }

    function markdownToHtml(markdown) {
        if (!markdown) return '답변을 받지 못했어요.';

        const codeBlocks = [];
        let text = String(markdown);

        text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
            const token = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<pre class="yy-code-block"><code>${escapeHtml(code.trim())}</code></pre>`);
            return token;
        });

        text = escapeHtml(text);

        const lines = text.split('\n');
        let html = '';
        let inUl = false;
        let inOl = false;

        function closeLists() {
            if (inUl) {
                html += '</ul>';
                inUl = false;
            }
            if (inOl) {
                html += '</ol>';
                inOl = false;
            }
        }

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (!line) {
                closeLists();
                html += '<br>';
                continue;
            }

            if (/^###\s+/.test(line)) {
                closeLists();
                html += `<h3>${parseInlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`;
                continue;
            }

            if (/^##\s+/.test(line)) {
                closeLists();
                html += `<h2>${parseInlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`;
                continue;
            }

            if (/^#\s+/.test(line)) {
                closeLists();
                html += `<h1>${parseInlineMarkdown(line.replace(/^#\s+/, ''))}</h1>`;
                continue;
            }

            if (/^[-*]\s+/.test(line)) {
                if (inOl) {
                    html += '</ol>';
                    inOl = false;
                }
                if (!inUl) {
                    html += '<ul>';
                    inUl = true;
                }
                html += `<li>${parseInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`;
                continue;
            }

            if (/^\d+\.\s+/.test(line)) {
                if (inUl) {
                    html += '</ul>';
                    inUl = false;
                }
                if (!inOl) {
                    html += '<ol>';
                    inOl = true;
                }
                html += `<li>${parseInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`;
                continue;
            }

            closeLists();
            html += `<p>${parseInlineMarkdown(line)}</p>`;
        }

        closeLists();

        codeBlocks.forEach((block, idx) => {
            html = html.replace(`__CODE_BLOCK_${idx}__`, block);
        });

        return html;
    }

    async function sendMessage(input, messages, overrideText) {
        const text = (overrideText || input.value).trim();
        if (!text) return;

        input.value = '';

        appendMsg(messages, 'user', escapeHtml(text));

        const typing = showTyping(messages);
        const sendBtn = document.getElementById('yySend');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const raw = await callRAG(text);
            const parsed = extractAnswer(raw);

            typing.remove();

            const html = markdownToHtml(parsed.answer);
            appendMsg(messages, 'bot', html, parsed.source);
        } catch (err) {
            console.error('[YamYam] request error:', err);
            typing.remove();

            const message =
                err.name === 'AbortError'
                    ? '응답 시간이 조금 길어지고 있어요. 다시 시도해주세요 ⏳'
                    : '서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요 🙏';

            appendMsg(messages, 'bot', message);
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    function injectStyles() {
        if (document.getElementById('yy-widget-styles')) return;

        const style = document.createElement('style');
        style.id = 'yy-widget-styles';
        style.textContent = `
            .yy-window {
                position: fixed;
                right: 24px;
                bottom: 90px;
                width: 415px;
                max-width: calc(100vw - 24px);
                height: 620px;
                max-height: calc(100vh - 120px);
                background: #ffffff;
                border-radius: 24px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.18);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                pointer-events: none;
                transform: translateY(12px) scale(0.98);
                transition: all 0.22s ease;
                z-index: 999999;
                border: 1px solid #eef2ee;
            }

            .yy-window.open {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0) scale(1);
            }

            .yy-fab {
                position: fixed;
                right: 24px;
                bottom: 24px;
                width: 62px;
                height: 62px;
                border: none;
                border-radius: 50%;
                background: linear-gradient(135deg, #79c95d, #4ea63d);
                color: #fff;
                box-shadow: 0 10px 28px rgba(63, 145, 52, 0.35);
                cursor: pointer;
                z-index: 1000000;
                font-size: 22px;
            }

            .yy-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 18px;
                background: #4a6028;
                border-bottom: 1px solid #edf2ed;
            }

            .yy-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .yy-avatar, .yy-msg-av {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #edf8e8;
                font-size: 20px;
                flex-shrink: 0;
            }

            .yy-name {
                font-weight: 700;
                font-size: 15px;
                color: #ffffff;
            }

            .yy-status {
                font-size: 12px;
                color: #ffffff;
            }

            .yy-dot {
                width: 8px;
                height: 8px;
                display: inline-block;
                border-radius: 50%;
                background: #46b450;
                margin-right: 6px;
            }

            .yy-close-btn, .yy-send {
                border: none;
                background: transparent;
                cursor: pointer;
            }

            .yy-chips-row {
                display: flex;
                gap: 8px;
                padding: 12px 14px;
                overflow-x: auto;
                border-bottom: 1px solid #f1f4f1;
            }

            .yy-chip {
                border: 1px solid #dfebdf;
                background: #f9fcf8;
                color: #355335;
                border-radius: 999px;
                padding: 8px 12px;
                white-space: nowrap;
                cursor: pointer;
                font-size: 13px;
            }

            .yy-messages {
                flex: 1;
                padding: 16px 14px 24px;
                background: linear-gradient(to bottom, #fcfefc, #f8fbf8);
                overflow-y: auto;
            }

            .yy-msg {
                display: flex;
                gap: 10px;
                margin: 5px 0;
                align-items: flex-start;
            }

            .yy-msg-body {
                width: 100%;
            }

            .yy-msg-body-user {
                display: flex;
                justify-content: flex-end;
                width: 100%;
            }

            .yy-bubble {
                padding: 12px 14px;
                border-radius: 18px;
                line-height: 1.6;
                font-size: 14px;
                word-break: break-word;
                overflow-wrap: anywhere;
                box-shadow: 0 4px 14px rgba(0,0,0,0.05);
            }

            .yy-bubble-bot {
                background: #ffffff;
                color: #1e261f;
                border-top-left-radius: 8px;
                border: 1px solid #edf2ed;
            }

            .yy-bubble-user {
                background: linear-gradient(135deg, #79c95d, #4ea63d);
                color: #ffffff;
                border-top-right-radius: 8px;
                width: 78%;
            }

            .yy-source-card {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
                padding: 6px 10px;
                border-radius: 999px;
                background: #f4f7f4;
                color: #5b6b5d;
                font-size: 12px;
                border: 1px solid #e3ebe3;
            }

            .yy-typing {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .yy-typing span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #9caf9d;
                animation: yyBlink 1.2s infinite ease-in-out;
            }

            .yy-typing span:nth-child(2) { animation-delay: 0.2s; }
            .yy-typing span:nth-child(3) { animation-delay: 0.4s; }

            @keyframes yyBlink {
                0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                40% { transform: scale(1); opacity: 1; }
            }

            .yy-input-bar {
                display: flex;
                gap: 10px;
                padding: 14px;
                border-top: 1px solid #eef3ee;
                background: #ffffff;
            }

            .yy-input {
                flex: 1;
                border: 1px solid #dce8dc;
                border-radius: 14px;
                padding: 12px 14px;
                font-size: 14px;
                outline: none;
            }

            .yy-input:focus {
                border-color: #78c35f;
                box-shadow: 0 0 0 4px rgba(120,195,95,0.12);
            }

            .yy-send {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #79c95d, #4ea63d);
                color: #fff;
                flex-shrink: 0;
            }

            .yy-send:disabled {
                opacity: 0.55;
                cursor: not-allowed;
            }

            .yy-markdown p {
                margin: 0 0 10px;
            }

            .yy-markdown p:last-child {
                margin-bottom: 0;
            }

            .yy-markdown h1,
            .yy-markdown h2,
            .yy-markdown h3 {
                margin: 0 0 10px;
                line-height: 1.4;
                color: #244424;
            }

            .yy-markdown h1 { font-size: 18px; }
            .yy-markdown h2 { font-size: 16px; }
            .yy-markdown h3 { font-size: 15px; }

            .yy-markdown ul,
            .yy-markdown ol {
                margin: 0 0 10px 18px;
                padding: 0;
            }

            .yy-markdown li {
                margin: 4px 0;
            }

            .yy-markdown strong {
                font-weight: 700;
                color: #2f7d32;
            }

            .yy-markdown code {
                padding: 2px 6px;
                border-radius: 6px;
                background: #f4f6f8;
                font-size: 12px;
            }

            .yy-code-block {
                margin: 10px 0;
                padding: 12px;
                background: #f5f7f8;
                border: 1px solid #e6ebef;
                border-radius: 12px;
                overflow-x: auto;
                font-size: 12px;
                line-height: 1.5;
            }

            .yy-code-block code {
                background: transparent;
                padding: 0;
            }

            .yy-markdown a {
                color: #2d6cdf;
                text-decoration: none;
            }

            .yy-markdown a:hover {
                text-decoration: underline;
            }

            .yy-markdown em {
                font-style: italic;
            }

            .yy-markdown del {
                text-decoration: line-through;
            }

            @media (max-width: 480px) {
                .yy-window {
                    right: 12px;
                    left: 12px;
                    bottom: 88px;
                    width: auto;
                    height: 70vh;
                }

                .yy-fab {
                    right: 16px;
                    bottom: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        injectStyles();

        const { fab, win } = buildWidget();
        const messages = win.querySelector('#yyMessages');
        const input = win.querySelector('#yyInput');
        const sendBtn = win.querySelector('#yySend');
        const closeBtn = win.querySelector('.yy-close-btn');
        const chips = win.querySelectorAll('.yy-chip');

        setTimeout(() => {
            const badge = fab.querySelector('.yy-fab-badge');
            if (badge) badge.style.display = 'none';
        }, 100000);

        function openWidget() {
            win.classList.add('open');
            fab.classList.add('open');
            setTimeout(() => input.focus(), 200);
        }

        function closeWidget() {
            win.classList.remove('open');
            fab.classList.remove('open');
        }

        function toggle() {
            if (win.classList.contains('open')) closeWidget();
            else openWidget();
        }

        fab.addEventListener('click', toggle);
        closeBtn.addEventListener('click', closeWidget);

        sendBtn.addEventListener('click', () => sendMessage(input, messages));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input, messages);
            }
        });

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (!win.classList.contains('open')) openWidget();
                sendMessage(input, messages, chip.dataset.msg);
            });
        });

        document.addEventListener('mousedown', e => {
            if (
                win.classList.contains('open') &&
                !win.contains(e.target) &&
                !fab.contains(e.target)
            ) {
                closeWidget();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();