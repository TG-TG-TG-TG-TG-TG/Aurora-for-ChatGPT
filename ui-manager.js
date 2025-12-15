/**
 * Aurora for ChatGPT - UI Manager
 * Facade pattern for managing UI components
 */

(() => {
    const Aurora = window.Aurora;

    // ============================================================================
    // Audio Engine - Synthesized UI sounds
    // ============================================================================
    class AudioEngine {
        constructor() {
            this.ctx = null;
            this._listenersAttached = false;
        }

        init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) this.ctx = new AudioContext();
            }
        }

        play(type, settings) {
            if (!settings?.soundEnabled || !this.ctx) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const vol = settings.soundVolume === 'high' ? 0.1 :
                (settings.soundVolume === 'medium' ? 0.05 : 0.02);

            if (type === 'hover') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.01);
                gain.gain.linearRampToValueAtTime(0, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.06);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
            } else if (type === 'toggle') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(600, t + 0.1);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol, t + 0.02);
                gain.gain.linearRampToValueAtTime(0, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
            }
        }

        attachListeners(settings) {
            if (this._listenersAttached || !settings?.soundEnabled) return;
            this._listenersAttached = true;

            document.body.addEventListener('mouseenter', (e) => {
                if (e.target.matches && e.target.matches('button, a, [role="button"], input, .btn')) {
                    this.play('hover', settings);
                }
            }, true);

            document.body.addEventListener('click', () => {
                this.play('click', settings);
            }, true);
        }
    }

    // ============================================================================
    // Contrast Engine - Auto contrast adjustment
    // ============================================================================
    class ContrastEngine {
        static analyze(imgElement, settings) {
            if (!settings?.autoContrast) return;

            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 50;
                canvas.height = 50;

                if (imgElement.src.startsWith('http') && !imgElement.src.includes(location.host)) {
                    imgElement.crossOrigin = "Anonymous";
                }

                ctx.drawImage(imgElement, 0, 0, 50, 50);
                const data = ctx.getImageData(0, 0, 50, 50).data;
                let colorSum = 0;

                for (let x = 0, len = data.length; x < len; x += 4) {
                    const avg = Math.floor((data[x] + data[x + 1] + data[x + 2]) / 3);
                    colorSum += avg;
                }

                const brightness = Math.floor(colorSum / (50 * 50));
                let newOpacity = 0.58;

                if (brightness > 200) newOpacity = 0.85;
                else if (brightness > 128) newOpacity = 0.70;
                else if (brightness < 50) newOpacity = 0.40;

                document.documentElement.style.setProperty('--bg-opacity', newOpacity);
            } catch (e) {
                document.documentElement.style.removeProperty('--bg-opacity');
            }
        }
    }

    // ============================================================================
    // Quick Settings Panel
    // ============================================================================
    class QuickSettingsPanel {
        constructor() {
            this.btn = null;
            this.panel = null;
            this._initialized = false;
        }

        init(settings) {
            if (!document.body) return;
            if (this._initialized) return;

            this._createElements();
            this._renderContent(settings);
            this._setupListeners(settings);
            this._initialized = true;
        }

        _createElements() {
            if (document.getElementById(Aurora.ELEMENT_IDS.QS_BUTTON)) return;

            this.btn = document.createElement('button');
            this.btn.id = Aurora.ELEMENT_IDS.QS_BUTTON;
            this.btn.title = Aurora.getMessage('quickSettingsButtonTitle');
            this.btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.65 19.5 12.33 19.5 12S19.47 11.35 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.35 4.5 11.67 4.5 12S4.53 12.65 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.04 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"></path></svg>`;

            this.panel = document.createElement('div');
            this.panel.id = Aurora.ELEMENT_IDS.QS_PANEL;
            this.panel.setAttribute('data-state', 'closed');

            document.body.appendChild(this.btn);
            document.body.appendChild(this.panel);
        }

        _renderContent(settings) {
            if (!this.panel) return;

            const currentAppearance = settings.appearance || 'clear';

            this.panel.innerHTML = `
        <div class="qs-section-title">${Aurora.getMessage('quickSettingsSectionVisibility')}</div>
        <div class="qs-row" data-setting="focusMode">
          <label>${Aurora.getMessage('labelFocusMode')}</label>
          <label class="switch"><input type="checkbox" id="qs-focusMode"><span class="track"><span class="thumb"></span></span></label>
        </div>
        <div class="qs-row" data-setting="hideUpgradeButtons">
          <label>${Aurora.getMessage('quickSettingsLabelHideUpgradeButtons')}</label>
          <label class="switch"><input type="checkbox" id="qs-hideUpgradeButtons"><span class="track"><span class="thumb"></span></span></label>
        </div>
        <div class="qs-row" data-setting="blurChatHistory">
          <label>${Aurora.getMessage('quickSettingsLabelStreamerMode')}</label>
          <label class="switch"><input type="checkbox" id="qs-blurChatHistory"><span class="track"><span class="thumb"></span></span></label>
        </div>
        <div class="qs-section-title">${Aurora.getMessage('sectionAppearance')}</div>
        <div class="qs-row" data-setting="appearance">
          <label>${Aurora.getMessage('quickSettingsLabelGlassStyle')}</label>
          <div class="aurora-glass-switch" id="qs-appearance-toggle" data-switch-state="${currentAppearance === 'dimmed' ? '1' : '0'}">
            <div class="aurora-switch-glider"></div>
            <button type="button" class="aurora-switch-btn" data-value="0" data-setting-value="clear">${Aurora.getMessage('glassAppearanceOptionClear')}</button>
            <button type="button" class="aurora-switch-btn" data-value="1" data-setting-value="dimmed">${Aurora.getMessage('glassAppearanceOptionDimmed')}</button>
          </div>
        </div>
        <div class="qs-section-title">Holiday Effects</div>
        <div class="qs-row" data-setting="enableSnowfall">
          <label>Snowfall</label>
          <label class="switch"><input type="checkbox" id="qs-enableSnowfall"><span class="track"><span class="thumb"></span></span></label>
        </div>
        <div class="qs-row" data-setting="enableNewYear">
          <label>New Year '26</label>
          <label class="switch"><input type="checkbox" id="qs-enableNewYear"><span class="track"><span class="thumb"></span></span></label>
        </div>
      `;
        }

        _setupListeners(settings) {
            if (!this.btn || !this.panel) return;

            // Open/close panel
            this.btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const state = this.panel.getAttribute('data-state');
                if (state === 'closed') {
                    this.panel.setAttribute('data-state', 'open');
                } else if (state === 'open') {
                    this.panel.setAttribute('data-state', 'closing');
                }
            });

            this.panel.addEventListener('animationend', (e) => {
                if (e.animationName === 'qs-panel-close' && this.panel.getAttribute('data-state') === 'closing') {
                    this.panel.setAttribute('data-state', 'closed');
                }
            });

            document.addEventListener('click', (e) => {
                if (this.panel && !this.panel.contains(e.target) && this.panel.getAttribute('data-state') === 'open') {
                    this.panel.setAttribute('data-state', 'closing');
                }
            });

            // Toggles
            ['focusMode', 'hideUpgradeButtons', 'blurChatHistory', 'enableSnowfall', 'enableNewYear'].forEach(key => {
                const checkbox = document.getElementById(`qs-${key}`);
                if (checkbox) {
                    checkbox.checked = !!settings[key];
                    checkbox.addEventListener('change', () => {
                        Aurora.setStorageSync({ [key]: checkbox.checked });
                    });
                }
            });

            // Appearance toggle
            const appearanceToggle = document.getElementById('qs-appearance-toggle');
            if (appearanceToggle) {
                appearanceToggle.querySelectorAll('.aurora-switch-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const settingValue = btn.dataset.settingValue;
                        const switchState = btn.dataset.value;

                        document.documentElement.classList.add(Aurora.CSS_CLASSES.THEME_TRANSITIONING);
                        setTimeout(() => {
                            document.documentElement.classList.remove(Aurora.CSS_CLASSES.THEME_TRANSITIONING);
                        }, 600);

                        Aurora.setStorageSync({ appearance: settingValue });
                        appearanceToggle.setAttribute('data-switch-state', switchState);
                    });
                });
            }
        }

        update(settings) {
            if (!this._initialized) {
                this.init(settings);
                return;
            }

            // Update checkboxes
            ['focusMode', 'hideUpgradeButtons', 'blurChatHistory', 'enableSnowfall', 'enableNewYear'].forEach(key => {
                const checkbox = document.getElementById(`qs-${key}`);
                if (checkbox) checkbox.checked = !!settings[key];
            });

            // Update appearance toggle
            const appearanceToggle = document.getElementById('qs-appearance-toggle');
            if (appearanceToggle) {
                const currentAppearance = settings.appearance || 'clear';
                appearanceToggle.setAttribute('data-switch-state', currentAppearance === 'dimmed' ? '1' : '0');
            }
        }

        remove() {
            this.btn?.remove();
            this.panel?.remove();
            this.btn = null;
            this.panel = null;
            this._initialized = false;
        }
    }

    // ============================================================================
    // Upgrade Button Hider
    // ============================================================================
    class UpgradeButtonManager {
        hide(settings) {
            if (!settings?.hideUpgradeButtons) {
                this._showAll();
                return;
            }

            const elementsToHide = [
                Aurora.getCachedElement('upgradePanelButton', () =>
                    Array.from(document.querySelectorAll(Aurora.SELECTORS.UPGRADE_MENU_ITEM))
                        .find(el => el.textContent.toLowerCase().includes('upgrade'))),
                Aurora.getCachedElement('upgradeTopButton', () =>
                    document.querySelector(Aurora.SELECTORS.UPGRADE_TOP_BUTTON)),
                Aurora.getCachedElement('upgradeProfileButton', () =>
                    document.querySelector(Aurora.SELECTORS.UPGRADE_PROFILE_BUTTON)),
                Aurora.getCachedElement('upgradeSidebarButton', () =>
                    Array.from(document.querySelectorAll(Aurora.SELECTORS.UPGRADE_SIDEBAR_BUTTON))
                        .find(el => el.textContent.toLowerCase().includes('upgrade'))),
                Aurora.getCachedElement('upgradeTinySidebar', () =>
                    document.querySelector(Aurora.SELECTORS.UPGRADE_TINY_SIDEBAR)),
                Aurora.getCachedElement('upgradeBottomBanner', () => {
                    const banner = Array.from(document.querySelectorAll(Aurora.SELECTORS.UPGRADE_BOTTOM_BANNER))
                        .find(el => el.textContent?.toLowerCase().includes('upgrade your plan'));
                    return banner ? banner.parentElement : null;
                }),
                Aurora.getCachedElement('upgradeSettingsRow', () => {
                    const rows = document.querySelectorAll(Aurora.SELECTORS.UPGRADE_SETTINGS_ROW);
                    for (const row of rows) {
                        const text = row.textContent || '';
                        const hasTitle = text.includes('Get ChatGPT Plus') || text.includes('Get ChatGPT Go');
                        const hasBtn = Array.from(row.querySelectorAll('button'))
                            .some(btn => btn.textContent.trim() === 'Upgrade');
                        if (hasTitle && hasBtn) return row;
                    }
                    return null;
                })
            ].filter(Boolean);

            Aurora.toggleClassForElements(elementsToHide, Aurora.CSS_CLASSES.HIDE_UPGRADE, true);
        }

        _showAll() {
            const hidden = document.getElementsByClassName(Aurora.CSS_CLASSES.HIDE_UPGRADE);
            if (hidden.length > 0) {
                Array.from(hidden).forEach(el => el.classList.remove(Aurora.CSS_CLASSES.HIDE_UPGRADE));
            }
        }
    }

    // ============================================================================
    // Glass Effect Manager
    // ============================================================================
    class GlassEffectManager {
        constructor() {
            this._selector = Aurora.GLASS_SELECTORS
                .map(s => `${s}:not([data-aurora-glass="true"])`)
                .join(',');
        }

        apply() {
            const elements = document.querySelectorAll(this._selector);
            for (const el of elements) {
                el.dataset.auroraGlass = 'true';
            }
        }
    }

    // ============================================================================
    // GPT5 Limit Manager
    // ============================================================================
    class Gpt5LimitManager {
        manage(settings) {
            const popup = document.querySelector(Aurora.SELECTORS.GPT5_LIMIT_POPUP);

            if (popup && !popup.textContent.toLowerCase().includes("you've reached the gpt-5 limit")) {
                return;
            }

            if (!settings?.hideGpt5Limit) {
                if (popup) popup.classList.remove(Aurora.CSS_CLASSES.HIDE_LIMIT);
                return;
            }

            if (!chrome?.runtime?.id) return;

            if (popup) {
                chrome.storage.local.get([Aurora.STORAGE_KEYS.GPT5_LIMIT_TIMESTAMP], (result) => {
                    if (chrome.runtime.lastError) return;

                    if (!result[Aurora.STORAGE_KEYS.GPT5_LIMIT_TIMESTAMP]) {
                        chrome.storage.local.set({ [Aurora.STORAGE_KEYS.GPT5_LIMIT_TIMESTAMP]: Date.now() });
                    } else if (Date.now() - result[Aurora.STORAGE_KEYS.GPT5_LIMIT_TIMESTAMP] > Aurora.TIMING.FIVE_MINUTES_MS) {
                        popup.classList.add(Aurora.CSS_CLASSES.HIDE_LIMIT);
                    }
                });
            } else {
                chrome.storage.local.remove([Aurora.STORAGE_KEYS.GPT5_LIMIT_TIMESTAMP]);
            }
        }
    }

    // ============================================================================
    // Holiday Manager - Snowfall & New Year Garland
    // ============================================================================
    class HolidayManager {
        manage(settings) {
            this._toggleSnow(!!settings.enableSnowfall);
            this._toggleNewYear(!!settings.enableNewYear);
        }

        _toggleSnow(enabled) {
            let container = document.getElementById(Aurora.ELEMENT_IDS.SNOW_CONTAINER);
            if (enabled) {
                if (container) return; // Already exists
                container = document.createElement('div');
                container.id = Aurora.ELEMENT_IDS.SNOW_CONTAINER;
                container.className = 'aurora-snow-container';

                // Create 50 snowflakes
                const fragment = document.createDocumentFragment();
                for (let i = 0; i < 50; i++) {
                    const snowflake = document.createElement('div');
                    snowflake.className = 'aurora-snowflake';
                    snowflake.style.left = `${Math.random() * 100}vw`;
                    snowflake.style.animationDuration = `${Math.random() * 3 + 2}s`; // 2-5s
                    snowflake.style.animationDelay = `${Math.random() * 5}s`;
                    snowflake.style.width = `${Math.random() * 6 + 4}px`; // 4-10px
                    snowflake.style.height = snowflake.style.width;
                    snowflake.style.opacity = Math.random();
                    fragment.appendChild(snowflake);
                }
                container.appendChild(fragment);
                document.body.appendChild(container); // Using body for now
                if (document.documentElement) document.documentElement.classList.add(Aurora.CSS_CLASSES.SNOWFALL_ON);
            } else {
                if (container) container.remove();
                if (document.documentElement) document.documentElement.classList.remove(Aurora.CSS_CLASSES.SNOWFALL_ON);
            }
        }

        _toggleNewYear(enabled) {
            let container = document.getElementById(Aurora.ELEMENT_IDS.GARLAND_CONTAINER);
            if (enabled) {
                if (container) return; // Already exists
                container = document.createElement('div');
                container.id = Aurora.ELEMENT_IDS.GARLAND_CONTAINER;
                container.className = 'aurora-garland-container';

                // Create segments based on width, assuming 50px per segment
                const segmentWidth = 50;
                const count = Math.ceil(window.innerWidth / segmentWidth) + 1;
                const fragment = document.createDocumentFragment();

                for (let i = 0; i < count; i++) {
                    const segment = document.createElement('div');
                    segment.className = 'aurora-garland-wire-segment';

                    const bulb = document.createElement('div');
                    bulb.className = 'aurora-bulb';
                    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
                    bulb.style.setProperty('--bulb-color', colors[Math.floor(Math.random() * colors.length)]);
                    bulb.style.animationDelay = `${Math.random() * 2}s`;

                    segment.appendChild(bulb);
                    fragment.appendChild(segment);
                }
                container.appendChild(fragment);
                document.body.appendChild(container); // Using body
                if (document.documentElement) document.documentElement.classList.add(Aurora.CSS_CLASSES.NEW_YEAR_ON);
            } else {
                if (container) container.remove();
                if (document.documentElement) document.documentElement.classList.remove(Aurora.CSS_CLASSES.NEW_YEAR_ON);
            }
        }
    }

    // ============================================================================
    // UI Manager (Facade)
    // ============================================================================
    class UIManager {
        constructor(settingsManager) {
            this.settings = settingsManager;
            this.audioEngine = new AudioEngine();
            this.quickSettings = new QuickSettingsPanel();
            this.upgradeHider = new UpgradeButtonManager();
            this.glassEffects = new GlassEffectManager();
            this.gpt5Limit = new Gpt5LimitManager();
            this.holidayManager = new HolidayManager();
        }

        /**
         * Apply all CSS flags to document
         */
        applyRootFlags() {
            const s = this.settings.getAll();
            const html = document.documentElement;

            html.classList.toggle(Aurora.CSS_CLASSES.AMBIENT_ON, true);
            html.classList.toggle(Aurora.CSS_CLASSES.LEGACY_COMPOSER, !!s.legacyComposer);
            html.classList.toggle(Aurora.CSS_CLASSES.ANIMATIONS_DISABLED, !!s.disableAnimations);
            html.classList.toggle(Aurora.CSS_CLASSES.APPEARANCE_CLEAR, s.appearance === 'clear');
            html.classList.toggle(Aurora.CSS_CLASSES.CUTE_VOICE, !!s.cuteVoiceUI);
            html.classList.toggle(Aurora.CSS_CLASSES.FOCUS_MODE, !!s.focusMode);
            html.classList.toggle(Aurora.CSS_CLASSES.BLUR_CHAT_HISTORY, !!s.blurChatHistory);
            html.classList.toggle(Aurora.CSS_CLASSES.BLUR_AVATAR, !!s.blurAvatar);

            // Font
            html.setAttribute('data-custom-font', s.customFont || 'system');

            // Voice color
            html.setAttribute('data-voice-color', s.voiceColor || 'default');

            // Theme
            const applyLightMode = (s.theme === 'light') ||
                (s.theme === 'auto' && html.classList.contains('light'));
            html.classList.toggle(Aurora.CSS_CLASSES.LIGHT_MODE, applyLightMode);

            // Save detected theme
            Aurora.setStorageLocal({ [Aurora.STORAGE_KEYS.DETECTED_THEME]: applyLightMode ? 'light' : 'dark' });
        }

        /**
         * Manage Quick Settings panel
         */
        manageQuickSettings() {
            const s = this.settings.getAll();

            if (s.hideQuickSettings) {
                this.quickSettings.remove();
            } else {
                if (!document.body) {
                    document.addEventListener('DOMContentLoaded', () => this.quickSettings.init(s), { once: true });
                } else {
                    this.quickSettings.update(s);
                }
            }
        }

        /**
         * Apply all UI settings
         */
        applyAll() {
            const s = this.settings.getAll();

            this.applyRootFlags();
            this.manageQuickSettings();
            this.upgradeHider.hide(s);
            this.glassEffects.apply();
            this.glassEffects.apply();
            this.gpt5Limit.manage(s);
            this.holidayManager.manage(s);

            // Audio
            if (s.soundEnabled) {
                this.audioEngine.init();
                this.audioEngine.attachListeners(s);
            }

            // Token counter
            if (window.AuroraTokenCounter) {
                window.AuroraTokenCounter.manage(!!s.showTokenCounter);
            }

            // Data masking
            if (window.DataMaskingEngine?.isEnabled?.()) {
                window.DataMaskingEngine.maskElement(document.body);
            }
        }

        /**
         * Handle tab visibility
         */
        handleTabVisibility(isHidden) {
            document.documentElement.classList.toggle(Aurora.CSS_CLASSES.TAB_HIDDEN, isHidden);
        }
    }

    // Export
    Aurora.AudioEngine = AudioEngine;
    Aurora.ContrastEngine = ContrastEngine;
    Aurora.QuickSettingsPanel = QuickSettingsPanel;
    Aurora.UpgradeButtonManager = UpgradeButtonManager;
    Aurora.GlassEffectManager = GlassEffectManager;
    Aurora.Gpt5LimitManager = Gpt5LimitManager;
    Aurora.HolidayManager = HolidayManager;
    Aurora.UIManager = UIManager;
    window.Aurora = Aurora;
})();
