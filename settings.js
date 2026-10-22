//settings
(function() {
    'use strict';

    let isOpen = false;
    let currentTheme = 'day';

    const FULLSCREEN_KEY = 'shnuk_fullscreen';
    const THEME_KEY = 'shnuk_theme';
    const APP_WALLPAPER_KEY = 'app_wallpaper';

    const FONT_MAIN = "'TTPaplane', monospace";

    function getWin() {
        if (window.Win) return window.Win;
        return {
            alert: (msg) => Promise.resolve(),
            confirm: (msg) => Promise.resolve(false),
            prompt: (msg, def) => Promise.resolve(null),
            notify: () => {}
        };
    }

    function isFullscreen() {
        return !!(document.fullscreenElement ||
                  document.webkitFullscreenElement ||
                  document.mozFullScreenElement ||
                  document.msFullscreenElement);
    }

    function enterFullscreen() {
        const el = document.documentElement;
        try {
            if (el.requestFullscreen) return el.requestFullscreen();
            if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
            if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
            if (el.msRequestFullscreen) return el.msRequestFullscreen();
        } catch(e) {}
        return Promise.reject('not supported');
    }

    function exitFullscreen() {
        try {
            if (document.exitFullscreen) return document.exitFullscreen();
            if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
            if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
            if (document.msExitFullscreen) return document.msExitFullscreen();
        } catch(e) {}
        return Promise.reject('not supported');
    }

    function toggleFullscreen() {
        if (isFullscreen()) {
            return exitFullscreen().then(function() {
                try { localStorage.setItem(FULLSCREEN_KEY, 'false'); } catch(e) {}
            });
        } else {
            return enterFullscreen().then(function() {
                try { localStorage.setItem(FULLSCREEN_KEY, 'true'); } catch(e) {}
            });
        }
    }

    function loadData() {
        try {
            currentTheme = localStorage.getItem(THEME_KEY) || 'day';
        } catch(e) {
            currentTheme = 'day';
        }
    }

    async function renderSystemInfo() {
        const container = document.getElementById('systemInfo');
        if (!container) return;

        let filesCount = 0;
        try {
            if (window.SharedFiles && window.SharedFiles.getAsync) {
                const arr = await window.SharedFiles.getAsync();
                filesCount = Array.isArray(arr) ? arr.length : 0;
            } else if (window.SharedFiles) {
                const arr = window.SharedFiles.get();
                filesCount = Array.isArray(arr) ? arr.length : 0;
            }
        } catch(e) {}

        let installedCount = 0;
        try {
            const installed = localStorage.getItem('shnuk_installed_apps');
            if (installed) {
                const parsed = JSON.parse(installed);
                installedCount = Array.isArray(parsed) ? parsed.length : 0;
            }
        } catch(e) {}

        let storageSize = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    storageSize += (localStorage.getItem(key) || '').length + key.length;
                }
            }
        } catch(e) {}

        if (window.OSStorage && window.OSStorage.estimate) {
            try {
                const est = await window.OSStorage.estimate();
                if (est && est.usage) storageSize += est.usage;
            } catch(e) {}
        }

        const sizeFormatted = formatBytes(storageSize);

        container.innerHTML = `
            <div class="system-image-wrap">
                <div class="system-image-text">Shnuk OS Demo</div>
            </div>
            <div class="info-row">
                <span class="info-label">Размер данных</span>
                <span class="info-value">${sizeFormatted}</span>
            </div>
        `;
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async function clearAllData() {
        const Win = getWin();

        const confirmed = await Win.confirm(
            'Будут удалены все данные. Система будет переустановлена с нуля.',
            {
                title: 'Полный сброс',
                okText: 'Продолжить',
                cancelText: 'Отмена',
                danger: true
            }
        );

        if (!confirmed) return;

        const confirmed2 = await Win.confirm(
            'Это действие нельзя отменить. Вы уверены?',
            {
                title: 'Последнее предупреждение',
                okText: 'Да, сбросить всё',
                cancelText: 'Нет, отмена',
                danger: true
            }
        );

        if (!confirmed2) return;

        try {
            localStorage.clear();
            sessionStorage.clear();
            if (window.OSStorage) {
                try { await window.OSStorage.files.clear(); } catch(e) {}
                try { await window.OSStorage.system.clear(); } catch(e) {}
            }
        } catch(e) {}

        closeSettings();
        setTimeout(() => location.reload(), 300);
    }

    function createUI() {
        if (isOpen) {
            const existing = document.getElementById('settingsApp');
            if (existing) {
                existing.style.display = 'block';
                existing.style.opacity = '1';
                return;
            }
        }

        loadData();

        const container = document.createElement('div');
        container.id = 'settingsApp';
        container.className = 'scroll-blur';
        container.style.cssText = `
            position: fixed;
            top: var(--livebar-h, 44px);
            left: 0;
            width: 100%;
            height: calc(100% - var(--livebar-h, 44px));
            background: var(--bg-primary);
            z-index: 99999;
            overflow-y: auto;
            font-family: ${FONT_MAIN};
            font-size: 20px;
            padding: 40px 24px 80px;
            animation: settingsFadeIn 0.25s ease;
            box-sizing: border-box;
            color: var(--text-primary);
            transition: background 0.4s ease, color 0.4s ease;
        `;

        if (!document.getElementById('settingsStyles')) {
            const style = document.createElement('style');
            style.id = 'settingsStyles';
            style.textContent = `
                @keyframes settingsFadeIn { from { opacity: 0; } to { opacity: 1; } }

                #settingsApp,
                #settingsApp * {
                    font-family: ${FONT_MAIN} !important;
                }

                .scroll-blur {
                    position: relative;
                    isolation: isolate;
                }
                .scroll-blur::after {
                    content: '';
                    position: fixed;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 80px;
                    pointer-events: none;
                    z-index: 20;
                    -webkit-backdrop-filter: blur(12px);
                    backdrop-filter: blur(12px);
                    -webkit-mask-image: linear-gradient(to top, #000 0%, #000 40%, transparent 100%);
                    mask-image: linear-gradient(to top, #000 0%, #000 40%, transparent 100%);
                }

                .settings-header {
                    display: flex; justify-content: space-between; align-items: center;
                    max-width: 720px; margin: 0 auto 28px;
                    padding-bottom: 18px; border-bottom: 2px solid var(--border-color);
                    gap: 12px;
                }
                .settings-header-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-width: 0;
                    flex: 1;
                }
                .settings-header-left h1 {
                    font-size: 30px; font-weight: 700; color: var(--text-primary);
                    letter-spacing: -0.3px;
                    margin: 0;
                }

                .settings-header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-shrink: 0;
                }
                .settings-icon-btn {
                    background: none; border: none; cursor: pointer;
                    padding: 8px; color: var(--text-secondary); transition: color 0.2s;
                    display: flex; align-items: center; justify-content: center;
                    width: 46px; height: 46px;
                }
                .settings-icon-btn:hover { color: var(--accent); }
                .settings-icon-btn svg { display: block; width: 28px; height: 28px; }

                .settings-stage {
                    position: relative;
                    width: 100%;
                    max-width: 720px;
                    margin: 0 auto;
                }

                .settings-section-title {
                    font-size: 19px; font-weight: 700; color: var(--text-muted);
                    text-transform: uppercase; letter-spacing: 0.8px;
                    margin-bottom: 16px;
                }

                .system-image-wrap {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 24px 0 32px;
                }
                .system-image-text {
                    font-family: ${FONT_MAIN};
                    font-weight: 700;
                    font-size: 56px;
                    line-height: 1.1;
                    color: var(--text-primary);
                    letter-spacing: 2px;
                    text-align: center;
                    user-select: none;
                    -webkit-user-select: none;
                    text-shadow: 0 2px 12px rgba(0,0,0,0.08);
                    word-break: break-word;
                }

                .system-info {
                    background: var(--bg-secondary); padding: 18px 22px; margin-bottom: 26px;
                }
                .system-info .info-row {
                    display: flex; justify-content: space-between;
                    align-items: center; padding: 12px 0;
                    border-bottom: 1px solid var(--border-color); font-size: 20px;
                }
                .system-info .info-row:last-child { border-bottom: none; }
                .system-info .info-label { color: var(--text-secondary); font-size: 19px; }
                .system-info .info-value {
                    color: var(--text-primary); font-weight: 700; text-align: right;
                }

                .action-card {
                    background: var(--bg-secondary); padding: 22px;
                    margin-bottom: 18px; border: 2px solid var(--border-color);
                }
                .action-card .action-title {
                    font-size: 22px; font-weight: 700;
                    color: var(--text-primary); margin-bottom: 10px;
                }
                .action-card .action-desc {
                    font-size: 19px; color: var(--text-secondary);
                    margin-bottom: 18px; line-height: 1.5;
                }
                .action-card button {
                    padding: 12px 26px; border: 2px solid var(--accent);
                    background: var(--accent); color: var(--text-on-accent);
                    cursor: pointer;
                    font-size: 20px; font-weight: 700;
                    transition: all 0.2s;
                }
                .action-card button:hover {
                    background: var(--accent-dark); transform: scale(1.02);
                }
                .action-card button.danger {
                    background: var(--accent); border-color: var(--accent); color: var(--text-on-accent);
                }
                .action-card button.danger:hover {
                    background: var(--accent-dark); border-color: var(--accent-dark);
                }
                .action-card.danger-card {
                    border-color: var(--border-color); background: var(--bg-hover);
                }

                .toggle-row {
                    display: flex; align-items: center;
                    justify-content: space-between;
                    padding: 18px 22px; background: var(--bg-secondary);
                    border: 2px solid var(--border-color); margin-bottom: 18px;
                    cursor: pointer; transition: all 0.2s;
                }
                .toggle-row:hover {
                    border-color: var(--accent); background: var(--bg-hover);
                }
                .toggle-row .tr-left {
                    display: flex; align-items: center; gap: 12px;
                }
                .toggle-row .tr-text {
                    font-size: 21px; font-weight: 700; color: var(--text-primary);
                }
                .toggle-row .tr-sub {
                    font-size: 16px; color: var(--text-muted); margin-top: 2px;
                }
                .toggle-row .tr-switch {
                    width: 54px; height: 32px; background: var(--border-color);
                    position: relative;
                    transition: background 0.3s; flex-shrink: 0;
                }
                .toggle-row .tr-switch::after {
                    content: ''; position: absolute;
                    top: 2px; left: 2px;
                    width: 28px; height: 28px;
                    background: var(--bg-primary);
                    transition: transform 0.3s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .toggle-row.active .tr-switch { background: var(--accent); }
                .toggle-row.active .tr-switch::after {
                    transform: translateX(22px);
                }

                @media (max-width: 900px) {
                    .system-image-text { font-size: 40px; }
                }
                @media (max-width: 500px) {
                    #settingsApp { padding: 24px 16px 60px; }
                    .settings-header-left h1 { font-size: 24px; }
                    .system-image-text { font-size: 32px; letter-spacing: 1.5px; }
                    .system-image-wrap { padding: 12px 0 20px; }
                    .system-info { padding: 14px 16px; }
                    .system-info .info-row { padding: 10px 0; font-size: 18px; }
                    .action-card { padding: 18px; }
                    .action-card .action-title { font-size: 19px; }
                    .action-card button { padding: 10px 20px; font-size: 18px; }
                    .toggle-row { padding: 16px 18px; }
                    .toggle-row .tr-text { font-size: 19px; }
                }
                @media (max-width: 360px) {
                    .system-image-text { font-size: 26px; letter-spacing: 1px; }
                }
            `;
            document.head.appendChild(style);
        }

        const isFs = isFullscreen();

        container.innerHTML = `
            <div class="settings-header">
                <div class="settings-header-left">
                    <h1>Настройки</h1>
                </div>
                <div class="settings-header-actions">
                    <button class="settings-icon-btn" id="settingsCloseBtn">
                        <svg viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="settings-stage">
                <div class="settings-section-title">Система</div>

                <div class="toggle-row ${isFs ? 'active' : ''}" id="fullscreenToggle">
                    <div class="tr-left">
                        <div>
                            <div class="tr-text">Полноэкранный режим</div>
                            <div class="tr-sub">Скрыть элементы браузера</div>
                        </div>
                    </div>
                    <div class="tr-switch"></div>
                </div>

                <div class="settings-section-title" style="margin-top:32px;">Информация о системе</div>
                <div class="system-info" id="systemInfo"></div>

                <div class="settings-section-title" style="margin-top:32px;">Обслуживание</div>

                <div class="action-card danger-card">
                    <div class="action-title" style="color: var(--accent);">Полный сброс</div>
                    <div class="action-desc">
                        Удалит все данные: приложения, темы, файлы, виджеты, пароль.
                    </div>
                    <button class="danger" id="clearAllBtn">Сбросить всё</button>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        isOpen = true;

        document.getElementById('settingsCloseBtn').addEventListener('click', function() {
            closeSettings();
        });

        const fsToggle = document.getElementById('fullscreenToggle');
        if (fsToggle) {
            fsToggle.addEventListener('click', function() {
                toggleFullscreen().then(function() {
                    if (isFullscreen()) fsToggle.classList.add('active');
                    else fsToggle.classList.remove('active');
                }).catch(function(err) {});
            });
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllData);
        }

        renderSystemInfo();

        const fsChangeHandler = function() {
            const toggle = document.getElementById('fullscreenToggle');
            if (toggle) {
                if (isFullscreen()) toggle.classList.add('active');
                else toggle.classList.remove('active');
            }
        };

        document.addEventListener('fullscreenchange', fsChangeHandler);
        document.addEventListener('webkitfullscreenchange', fsChangeHandler);
        document.addEventListener('mozfullscreenchange', fsChangeHandler);
        document.addEventListener('MSFullscreenChange', fsChangeHandler);

        const onEsc = function(e) {
            if (e.key === 'Escape') {
                closeSettings();
                document.removeEventListener('keydown', onEsc);
            }
        };
        document.addEventListener('keydown', onEsc);
    }

    function closeSettings() {
        const el = document.getElementById('settingsApp');
        if (!el) {
            isOpen = false;
            return;
        }

        isOpen = false;

        if (window.ShnukCloseAnimation) {
            window.ShnukCloseAnimation(el, 'settings', function() {
                el.remove();
            });
        } else {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 250);
        }
    }

    function destroy() {
        isOpen = false;
        const el = document.getElementById('settingsApp');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    window.Settings = {
        destroy: destroy,
        openSection: function() {
            if (!isOpen) createUI();
        },
        toggleTheme: function() {}
    };
    window.settingsInit = function() {
        if (isOpen) {
            const el = document.getElementById('settingsApp');
            if (el) {
                el.style.display = 'block';
                el.style.opacity = '1';
                return;
            }
        }
        createUI();
    };

    window.openSettings = window.settingsInit;
    window.toggleFullscreen = toggleFullscreen;
    window.enterFullscreen = enterFullscreen;
    window.exitFullscreen = exitFullscreen;
    window.isFullscreen = isFullscreen;

})();