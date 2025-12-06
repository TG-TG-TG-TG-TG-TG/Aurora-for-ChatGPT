/**
 * Aurora for ChatGPT - Content Script
 * Main orchestrator coordinating all modules
 */

(() => {
  'use strict';

  const Aurora = window.Aurora;
  if (!Aurora) {
    console.error('Aurora: Required modules not loaded');
    return;
  }

  // ============================================================================
  // Model Switcher - Default model selection management
  // ============================================================================
  class ModelSwitcher {
    constructor(settingsManager) {
      this.settings = settingsManager;
      this.lastApplied = null;
      this.cooldownUntil = 0;
      this.applying = false;
      this.applyPromise = null;
    }

    async apply(force = false) {
      const slug = (this.settings.get('defaultModel') || '').trim();
      if (!slug) {
        this.lastApplied = null;
        this.cooldownUntil = 0;
        return;
      }

      if (!force && Date.now() < this.cooldownUntil) return;
      if (this.applying || this.applyPromise) return;

      this.applyPromise = this._attemptApply(slug, 2);
      await this.applyPromise;
      this.applyPromise = null;
    }

    async _attemptApply(slug, remaining) {
      const success = await this._applyOnce(slug);
      if (success) {
        this.cooldownUntil = Date.now() + Aurora.TIMING.MODEL_APPLY_COOLDOWN;
        return true;
      }
      if (remaining <= 0) {
        this.cooldownUntil = Date.now() + Aurora.TIMING.MODEL_APPLY_FAIL_COOLDOWN;
        return false;
      }
      await new Promise(r => setTimeout(r, 400));
      return this._attemptApply(slug, remaining - 1);
    }

    async _applyOnce(slug) {
      const button = document.querySelector(Aurora.SELECTORS.MODEL_SWITCHER);
      if (!button) return false;

      const currentLabel = button.getAttribute('aria-label') || button.textContent || '';
      if (this._textMatches(currentLabel, slug)) {
        this.lastApplied = slug;
        return true;
      }

      this.applying = true;
      try {
        if (button.getAttribute('aria-expanded') !== 'true') {
          button.click();
        }

        let menu = await Aurora.waitFor(() => this._findMenu(button), 1200);
        if (!menu) return false;

        if (Aurora.MODEL_CONFIG.LEGACY_SLUGS.has(slug)) {
          const legacyMenu = await this._openLegacyMenu(menu);
          if (legacyMenu) menu = legacyMenu;
        }

        const option = this._findOption(menu, slug);
        if (!option) return false;

        option.click();
        this.lastApplied = slug;
        return true;
      } finally {
        this.applying = false;
        requestAnimationFrame(() => {
          if (button.getAttribute('aria-expanded') === 'true') {
            button.click();
          }
        });
      }
    }

    _textMatches(text, slug) {
      const normalized = Aurora.normalizeToken(text);
      const hints = Aurora.MODEL_CONFIG.LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
      return hints.some(hint => normalized.includes(Aurora.normalizeToken(hint)));
    }

    _findMenu(button) {
      const ariaControls = button?.getAttribute('aria-controls');
      if (ariaControls) {
        const controlled = document.getElementById(ariaControls);
        if (controlled && Aurora.isElementVisible(controlled)) return controlled;
      }
      const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(Aurora.isElementVisible);
      return menus[menus.length - 1] || null;
    }

    _findOption(menu, slug) {
      const hints = Aurora.MODEL_CONFIG.LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
      const normalizedHints = hints.map(Aurora.normalizeToken).filter(Boolean);
      const candidates = Array.from(menu.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button'))
        .filter(el => Aurora.isElementVisible(el) && el.closest('[role="menu"]') === menu);

      for (const el of candidates) {
        const text = el.getAttribute('aria-label') || el.textContent || '';
        const normalized = Aurora.normalizeToken(text);
        if (!normalized) continue;
        if (slug === 'gpt-5-thinking' && normalized.includes('mini')) continue;

        if (normalizedHints.some(hint =>
          normalized === hint ||
          normalized.startsWith(`${hint} `) ||
          normalized.endsWith(` ${hint}`) ||
          normalized.includes(hint)
        )) {
          return el;
        }
      }
      return null;
    }

    async _openLegacyMenu(menu) {
      const trigger = Array.from(menu.querySelectorAll('[role="menuitem"], button'))
        .find(el => Aurora.isElementVisible(el) && Aurora.normalizeToken(el.textContent || '').includes('legacy models'));

      if (!trigger) return menu;

      const pointerInit = { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
      try { trigger.dispatchEvent(new PointerEvent('pointerover', pointerInit)); } catch (e) { }
      try { trigger.dispatchEvent(new PointerEvent('pointerenter', pointerInit)); } catch (e) { }
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      trigger.focus();
      trigger.click();

      const submenu = await Aurora.waitFor(() => {
        const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(Aurora.isElementVisible);
        return menus.length > 1 ? menus[menus.length - 1] : null;
      }, 800);

      return submenu || menu;
    }
  }

  // ============================================================================
  // Welcome Screen
  // ============================================================================
  class WelcomeScreen {
    constructor(settingsManager, backgroundManager) {
      this.settings = settingsManager;
      this.background = backgroundManager;
    }

    show() {
      const overlay = document.createElement('div');
      overlay.id = Aurora.ELEMENT_IDS.WELCOME_OVERLAY;
      overlay.innerHTML = this._getHTML();
      document.body.appendChild(overlay);

      this._setupListeners(overlay);
    }

    _getHTML() {
      return `
        <div class="welcome-container">
          <div id="screen-1" class="screen active">
            <div class="content-panel">
              <div class="logo">✨</div>
              <h1>${Aurora.getMessage('welcomeTitle')}</h1>
              <p>${Aurora.getMessage('welcomeDescription')}</p>
              <button id="get-started-btn" class="welcome-btn primary">${Aurora.getMessage('welcomeBtnGetStarted')}</button>
            </div>
          </div>
        </div>
        <div id="aurora-style-bar" class="aurora-setup-bar">
          <div class="setup-section">
            <label class="section-label">${Aurora.getMessage('welcomeLabelBgPreset')}</label>
            <div class="preset-grid">
              <button class="preset-tile" data-bg-url="default"><div class="preview default"></div><span>${Aurora.getMessage('welcomePresetDefault')}</span></button>
              <button class="preset-tile" data-bg-url="__gpt5_animated__"><div class="preview animated"></div><span>${Aurora.getMessage('welcomePresetAnimated')}</span></button>
              <button class="preset-tile" data-bg-url="grokHorizon"><div class="preview grok"></div><span>${Aurora.getMessage('welcomePresetHorizon')}</span></button>
              <button class="preset-tile" data-bg-url="blue"><div class="preview blue"></div><span>${Aurora.getMessage('welcomePresetBlue')}</span></button>
            </div>
          </div>
          <div class="setup-section">
            <label class="section-label">${Aurora.getMessage('welcomeLabelGlassStyle')}</label>
            <div class="pill-group">
              <button class="pill-btn" data-appearance="clear">${Aurora.getMessage('welcomeGlassClear')}</button>
              <button class="pill-btn" data-appearance="dimmed">${Aurora.getMessage('welcomeGlassDimmed')}</button>
            </div>
          </div>
          <button id="finish-btn" class="welcome-btn primary finish-button">${Aurora.getMessage('welcomeBtnFinish')}</button>
        </div>
      `;
    }

    _setupListeners(overlay) {
      const getStartedBtn = overlay.querySelector('#get-started-btn');
      const finishBtn = overlay.querySelector('#finish-btn');
      const container = overlay.querySelector('.welcome-container');
      const styleBar = overlay.querySelector('#aurora-style-bar');

      let tempSettings = { ...this.settings.getAll() };

      getStartedBtn?.addEventListener('click', () => {
        overlay.classList.add('setup-active');
        container?.classList.add('exiting');
        setTimeout(() => styleBar?.classList.add('active'), 150);
        setTimeout(() => { if (container) container.style.display = 'none'; }, 500);

        overlay.querySelector('.preset-tile[data-bg-url="default"]')?.classList.add('active');
        overlay.querySelector('.pill-btn[data-appearance="clear"]')?.classList.add('active');
      });

      overlay.querySelectorAll('.preset-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          overlay.querySelectorAll('.preset-tile').forEach(t => t.classList.remove('active'));
          tile.classList.add('active');

          const choice = tile.dataset.bgUrl;
          let url = '';
          if (choice === 'blue') url = Aurora.URLS.BLUE_WALLPAPER;
          else if (choice === 'grokHorizon') url = Aurora.URLS.GROK_HORIZON;
          else if (choice === '__gpt5_animated__') url = '__gpt5_animated__';

          tempSettings.customBgUrl = url;
          this.settings.set('customBgUrl', url);
          this.background?.updateImage();
        });
      });

      overlay.querySelectorAll('.pill-btn').forEach(pill => {
        pill.addEventListener('click', () => {
          overlay.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');

          const appearance = pill.dataset.appearance;
          tempSettings.appearance = appearance;
          this.settings.set('appearance', appearance);
        });
      });

      finishBtn?.addEventListener('click', async () => {
        tempSettings.hasSeenWelcomeScreen = true;
        await this.settings.setMultiple(tempSettings);
        overlay.remove();
      });
    }
  }

  // ============================================================================
  // Aurora App - Main application class
  // ============================================================================
  class AuroraApp {
    constructor() {
      this.settings = Aurora.SettingsManager.getInstance();
      this.background = null;
      this.ui = null;
      this.modelSwitcher = null;
      this.observersStarted = false;
      this.welcomeChecked = false;
    }

    async init() {
      await this.settings.init();

      this.background = new Aurora.BackgroundManager(this.settings);
      this.ui = new Aurora.UIManager(this.settings);
      this.modelSwitcher = new ModelSwitcher(this.settings);

      this._initI18n();
      this._applyAll();
      this._startObservers();
      this._setupStorageListener();
      this._checkWelcomeScreen();
    }

    async _initI18n() {
      try {
        if (window.AuroraI18n?.initialize) {
          await window.AuroraI18n.initialize();
        }
      } catch (e) {
        console.warn('Aurora: Could not initialize i18n');
      }
    }

    _applyAll() {
      this.background.show();
      this.ui.applyAll();
      this.modelSwitcher.apply();

      // Contrast Engine
      if (this.settings.get('autoContrast')) {
        const img = this.background.getActiveImage();
        if (img?.complete) Aurora.ContrastEngine.analyze(img, this.settings.getAll());
      } else {
        document.documentElement.style.removeProperty('--bg-opacity');
      }

      // Manage Data Masking Engine
      if (window.DataMaskingEngine?.init) {
        window.DataMaskingEngine.init().then(() => {
          if (window.DataMaskingEngine.isEnabled()) {
            window.DataMaskingEngine.maskElement(document.body);
          }
        });
      }
    }

    _startObservers() {
      if (this.observersStarted) return;
      this.observersStarted = true;

      // Visibility change
      document.addEventListener('visibilitychange', () => {
        this.ui.handleTabVisibility(document.hidden);
        this.background.handleVisibilityChange(document.hidden);
      }, { passive: true });

      // Focus
      window.addEventListener('focus', () => this._applyAll(), { passive: true });

      // URL change
      let lastUrl = location.href;
      const checkUrl = () => {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        this._applyAll();
      };

      window.addEventListener('popstate', checkUrl, { passive: true });

      const origPush = history.pushState;
      history.pushState = function (...args) {
        origPush.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      const origReplace = history.replaceState;
      history.replaceState = function (...args) {
        origReplace.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      // DOM mutations
      const debouncedChecks = Aurora.debounce(() => {
        this.ui.gpt5Limit.manage(this.settings.getAll());
        this.modelSwitcher.apply();
      }, Aurora.TIMING.DEBOUNCE_DEFAULT);

      let renderFrameId = null;
      const domObserver = new MutationObserver((mutations) => {
        if (renderFrameId) return;

        renderFrameId = requestAnimationFrame(() => {
          this.ui.upgradeHider.hide(this.settings.getAll());
          this.ui.glassEffects.apply();

          if (window.DataMaskingEngine?.isEnabled?.()) {
            mutations.forEach(m => {
              m.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  window.DataMaskingEngine.maskElement(node);
                }
              });
            });
          }

          renderFrameId = null;
        });

        debouncedChecks();
      });

      if (document.body) {
        domObserver.observe(document.body, { childList: true, subtree: true });
      }

      // Theme observer
      const themeObserver = new MutationObserver(() => {
        if (this.settings.get('theme') === 'auto') {
          this.ui.applyRootFlags();
        }
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    _setupStorageListener() {
      if (!chrome?.storage?.onChanged) return;

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
          const bgKeys = ['customBgUrl', 'backgroundBlur', 'backgroundScaling'];
          const changedKeys = Object.keys(changes);
          const isBgChange = changedKeys.some(k => bgKeys.includes(k));

          if (isBgChange) {
            this.background.refreshStyles();
            this.background.updateImage();
          }

          this.ui.applyAll();
        } else if (area === 'local' && changes[Aurora.STORAGE_KEYS.LOCAL_BG]) {
          this.background.updateImage();
        }
      });
    }

    _checkWelcomeScreen() {
      if (this.welcomeChecked) return;
      this.welcomeChecked = true;

      if (!this.settings.get('hasSeenWelcomeScreen')) {
        const welcome = new WelcomeScreen(this.settings, this.background);
        welcome.show();
      }
    }
  }

  // ============================================================================
  // Snapshot Mode Styles
  // ============================================================================
  const snapshotStyle = document.createElement('style');
  snapshotStyle.textContent = `
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} body > *:not(#__next) { display: none !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} #__next > *:not(main) { display: none !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} #stage-slideover-sidebar { display: none !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} .sticky { position: static !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} form { display: none !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} header { display: none !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} main .text-token-text-primary { margin: 0 auto !important; max-width: 800px !important; }
    html.${Aurora.CSS_CLASSES.SNAPSHOT_MODE} main { padding-bottom: 50px !important; }
  `;

  if (document.head) {
    document.head.appendChild(snapshotStyle);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(snapshotStyle), { once: true });
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  const app = new AuroraApp();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await app.init();
    }, { once: true });
  } else {
    (async () => {
      await app.init();
    })();
  }

})();