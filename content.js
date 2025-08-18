// content.js — Ambient Blur + scoped transparency + robust hide/show + legacy toggle
(() => {
  const ID = 'cgpt-ambient-bg';
  const HTML_CLASS = 'cgpt-ambient-on';
  const LEGACY_CLASS = 'cgpt-legacy-composer';
  const LIGHT_CLASS = 'cgpt-light-mode';
  const ANIMATIONS_DISABLED_CLASS = 'cgpt-animations-disabled';
  const DEFAULTS = { showInChats: true, legacyComposer: false, lightMode: false, hideGpt5Limit: false, hideUpgradeButtons: false, disableAnimations: false };
  let settings = { ...DEFAULTS };

  // --- Selectors and Classes ---
  const GPT5_LIMIT_POPUP_SELECTOR = '.dark\\:bg-token-main-surface-secondary.text-token-text-primary.bg-token-main-surface-primary.border-token-border-default.md\\:items-center.shadow-xxs.dark\\:border-transparent.lg\\:mx-auto.\\[text-wrap\\:pretty\\].text-sm.pe-3.ps-5.py-4.border.rounded-3xl.gap-4.items-start.w-full.flex';
  const HIDE_LIMIT_CLASS = 'cgpt-gpt5-limit-hidden';

  const PANEL_UPGRADE_SELECTOR = 'div.gap-1\\.5.__menu-item.group:nth-of-type(2)';
  const TOP_UPGRADE_SELECTOR = '.rtl\\:translate-x-1\\/2.ltr\\:-translate-x-1\\/2.start-1\\/2.absolute';
  const HIDE_UPGRADE_CLASS = 'cgpt-upgrade-hidden';

  const TIMESTAMP_KEY = 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = 5 * 60 * 1000;


  function manageGpt5LimitPopup() {
    const popup = document.querySelector(GPT5_LIMIT_POPUP_SELECTOR);

    if (!settings.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_LIMIT_CLASS);
      return;
    }

    // If chrome.runtime is not available, the context is gone.
    if (!chrome?.runtime?.id) {
      return;
    }

    if (popup) {
      chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
        // If context is invalidated before this callback runs, lastError will be set.
        if (chrome.runtime.lastError) {
          return; // Stop execution to prevent errors.
        }

        const timestamp = result[TIMESTAMP_KEY];
        if (!timestamp) {
          let newTimestamp = { [TIMESTAMP_KEY]: Date.now() };
          chrome.storage.local.set(newTimestamp, () => {
            // Also check for error on set, just in case.
            if (chrome.runtime.lastError) { /* Silently fail */ }
          });
        } else {
          if (Date.now() - timestamp > FIVE_MINUTES_MS) {
            popup.classList.add(HIDE_LIMIT_CLASS);
          }
        }
      });
    } else {
      chrome.storage.local.remove([TIMESTAMP_KEY], () => {
        // Also check for error on remove.
        if (chrome.runtime.lastError) { /* Silently fail */ }
      });
    }
  }

  function manageUpgradeButtons() {
    const panelButton = document.querySelector(PANEL_UPGRADE_SELECTOR);
    const topButtonContainer = document.querySelector(TOP_UPGRADE_SELECTOR);

    const shouldHide = settings.hideUpgradeButtons;

    if (panelButton) {
      if (panelButton.textContent.toLowerCase().includes('upgrade')) {
         panelButton.classList.toggle(HIDE_UPGRADE_CLASS, shouldHide);
      }
    }
    if (topButtonContainer) {
        topButtonContainer.classList.toggle(HIDE_UPGRADE_CLASS, shouldHide);
    }
  }

  const isChatPage = () => location.pathname.startsWith('/c/');

  function ensureAppOnTop() {
    const app =
      document.getElementById('__next') ||
      document.querySelector('#root') ||
      document.querySelector('main') ||
      document.body.firstElementChild;
    if (!app) return;
    const cs = getComputedStyle(app);
    if (cs.position === 'static') app.style.position = 'relative';
    if (!app.style.zIndex || parseInt(app.style.zIndex || '0', 10) < 0) app.style.zIndex = '0';
  }

  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none' });
    wrap.innerHTML = `
      <picture>
        <source type="image/webp"
          srcset="https://persistent.oaistatic.com/burrito-nux/640.webp 640w,
                  https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w,
                  https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w">
        <img alt="" aria-hidden="true" sizes="100vw" loading="eager" fetchpriority="high"
          srcset="https://persistent.oaistatic.com/burrito-nux/640.webp 640w,
                  https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w,
                  https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w"
          src="https://persistent.oaistatic.com/burrito-nux/640.webp">
      </picture>
      <div class="haze"></div>
      <div class="overlay"></div>
    `;
    return wrap;
  }

  function applyRootFlags() {
    document.documentElement.classList.toggle(HTML_CLASS, shouldShow());
    document.documentElement.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    document.documentElement.classList.toggle(LIGHT_CLASS, !!settings.lightMode);
    document.documentElement.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
  }

  function showBg() {
    if (!document.getElementById(ID)) {
      const node = makeBgNode();
      const add = () => { document.body.prepend(node); ensureAppOnTop(); };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    }
  }

  function hideBg() {
    const node = document.getElementById(ID);
    if (node) node.remove();
  }

  function shouldShow() {
    return !(isChatPage() && !settings.showInChats);
  }

  function applyAllSettings() {
    if (shouldShow()) showBg(); else hideBg();
    applyRootFlags();
    manageGpt5LimitPopup();
    manageUpgradeButtons();
  }

  function startObservers() {
    // Re-apply settings when the window regains focus (e.g., after closing popup)
    window.addEventListener('focus', applyAllSettings, { passive: true });

    let lastUrl = location.href;
    const checkUrl = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        applyAllSettings();
      }
    };
    window.addEventListener('popstate', checkUrl, { passive: true });
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkUrl, 0);
    };
    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkUrl, 0);
    };

    // DOM observer for dynamically added elements
    const domObserver = new MutationObserver(() => {
        manageGpt5LimitPopup();
        manageUpgradeButtons();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Init
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (res) => {
      settings = { ...DEFAULTS, ...res };
      applyAllSettings();
      startObservers();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let needsUpdate = false;
      for (let key in changes) {
        if (key in settings) {
          settings[key] = changes[key].newValue;
          needsUpdate = true;
        }
      }
      if (needsUpdate) applyAllSettings();
    });
  } else {
    applyAllSettings();
    startObservers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllSettings, { once: true });
  } else {
    applyAllSettings();
  }
})();