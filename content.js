// content.js — Ambient Blur + scoped transparency + robust hide/show + legacy toggle
(() => {
  const ID = 'cgpt-ambient-bg';
  const HTML_CLASS = 'cgpt-ambient-on';
  const LEGACY_CLASS = 'cgpt-legacy-composer';
  const LIGHT_CLASS = 'cgpt-light-mode';
  const DEFAULTS = { showInChats: true, legacyComposer: false, lightMode: false, hideGpt5Limit: false };
  let settings = { ...DEFAULTS };

  // --- GPT-5 Limit Popup Logic ---
  const LIMIT_POPUP_SELECTOR = '.dark\\:bg-token-main-surface-secondary.text-token-text-primary.bg-token-main-surface-primary.border-token-border-default.md\\:items-center.shadow-xxs.dark\\:border-transparent.lg\\:mx-auto.\\[text-wrap\\:pretty\\].text-sm.pe-3.ps-5.py-4.border.rounded-3xl.gap-4.items-start.w-full.flex';
  const HIDE_CLASS = 'cgpt-gpt5-limit-hidden';
  const TIMESTAMP_KEY = 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  function manageGpt5LimitPopup() {
    const popup = document.querySelector(LIMIT_POPUP_SELECTOR);

    if (!settings.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_CLASS);
      return;
    }

    if (popup) {
      chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
        const timestamp = result[TIMESTAMP_KEY];
        if (!timestamp) {
          let newTimestamp = {};
          newTimestamp[TIMESTAMP_KEY] = Date.now();
          chrome.storage.local.set(newTimestamp);
        } else {
          if (Date.now() - timestamp > FIVE_MINUTES_MS) {
            popup.classList.add(HIDE_CLASS);
          }
        }
      });
    } else {
      chrome.storage.local.remove([TIMESTAMP_KEY]);
    }
  }
  // --- End of Logic ---

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

  function applyVisibility() {
    if (shouldShow()) showBg(); else hideBg();
    applyRootFlags();
    manageGpt5LimitPopup();
  }

  function startObservers() {
    // URL change detection for SPA navigation
    let lastUrl = location.href;
    const checkUrl = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        applyVisibility();
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

    // DOM observer for the GPT-5 limit popup
    const domObserver = new MutationObserver(manageGpt5LimitPopup);
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Init
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (res) => {
      settings = { ...DEFAULTS, ...res };
      applyVisibility();
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
      if (needsUpdate) applyVisibility();
    });
  } else {
    applyVisibility();
    startObservers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyVisibility, { once: true });
  } else {
    applyVisibility();
  }
})();