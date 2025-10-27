// content.js — Ambient Blur + scoped transparency + robust hide/show + legacy toggle
(() => {
  const ID = 'cgpt-ambient-bg';
  const STYLE_ID = 'cgpt-ambient-styles';
  const QS_BUTTON_ID = 'cgpt-qs-btn';
  const QS_PANEL_ID = 'cgpt-qs-panel';
  const HTML_CLASS = 'cgpt-ambient-on';
  const LEGACY_CLASS = 'cgpt-legacy-composer';
  const LIGHT_CLASS = 'cgpt-light-mode';
  const ANIMATIONS_DISABLED_CLASS = 'cgpt-animations-disabled';
  const BG_ANIM_DISABLED_CLASS = 'cgpt-bg-anim-disabled';
  const CLEAR_APPEARANCE_CLASS = 'cgpt-appearance-clear';
  let settings = {};
  let lastDefaultModelApplied = null;
  let modelApplyCooldownUntil = 0;
  let defaultModelApplyPromise = null;
  let applyingDefaultModel = false;

  const LOCAL_BG_KEY = 'customBgData';
  const HIDE_LIMIT_CLASS = 'cgpt-hide-gpt5-limit';
  const HIDE_UPGRADE_CLASS = 'cgpt-hide-upgrade';
  const HIDE_SORA_CLASS = 'cgpt-hide-sora';
  const HIDE_GPTS_CLASS = 'cgpt-hide-gpts';
  const TIMESTAMP_KEY = 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
  const GROK_HORIZON_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Aurora/grok-4.webp') : 'Aurora/grok-4.webp';

  // Group DOM selectors for easier maintenance. Fragile selectors are noted.
const SELECTORS = {
    GPT5_LIMIT_POPUP: 'div[class*="text-token-text-primary"]',
    UPGRADE_MENU_ITEM: 'a.__menu-item', // In user profile menu
    UPGRADE_TOP_BUTTON_CONTAINER: '.start-1\\/2.absolute', // Fragile: top-center button on free plan
    UPGRADE_PROFILE_BUTTON_TRAILING_ICON: '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn', // Good selector
    UPGRADE_SIDEBAR_BUTTON: 'div.gap-1\\.5.__menu-item.group', // Fragile: sidebar button
    UPGRADE_TINY_SIDEBAR_ICON: '#stage-sidebar-tiny-bar > div:nth-of-type(4)', // Fragile: depends on element order
    UPGRADE_SETTINGS_ROW_CONTAINER: 'div.py-2.border-b', // Container for settings row
    UPGRADE_BOTTOM_BANNER: 'div[role="button"]', // Bottom "Upgrade your plan" banner
    SORA_BUTTON_ID: 'sora', // Use with getElementById
    GPTS_BUTTON: 'a[href="/gpts"]',
    PROFILE_BUTTON: '[data-testid="accounts-profile-button"]',
  };

  const MODEL_LABEL_HINTS = {
    'gpt-5': ['auto', 'gpt-5'],
    'gpt-5-thinking': ['gpt-5 thinking', 'thinking'],
    'gpt-5-thinking-mini': ['thinking mini', 'mini'],
    'gpt-5-thinking-instant': ['instant'],
    'gpt-4o': ['gpt-4o', '4o'],
    'gpt-4.1': ['gpt-4.1', 'gpt 4.1'],
    o3: ['o3'],
    'o4-mini': ['o4 mini', 'o4-mini']
  };

  const LEGACY_MODEL_SLUGS = new Set(['gpt-4o', 'gpt-4.1', 'o3', 'o4-mini']);

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const toggleClassForElements = (elements, className, force) => {
    elements.forEach(el => {
      if (el) el.classList.toggle(className, force);
    });
  };

  // Use AuroraI18n for language detection (ChatGPT language priority)
  const getMessage = (key, substitutions) => {
    try {
      // Try AuroraI18n first (supports ChatGPT language detection)
      if (window.AuroraI18n?.getMessage) {
        const text = window.AuroraI18n.getMessage(key, substitutions);
        if (text && text !== key) return text;
      }
      
      // Fallback to Chrome's built-in i18n
      if (chrome?.i18n?.getMessage && chrome.runtime?.id) {
        const text = chrome.i18n.getMessage(key, substitutions);
        if (text) return text;
      }
    } catch (e) {
      if (!e.message.toLowerCase().includes('extension context invalidated')) {
        console.error("Aurora Extension Error:", e);
      }
      return key; // Fallback to key if context is lost
    }
    return key;
  };

  function manageGpt5LimitPopup() {
    const popup = document.querySelector(SELECTORS.GPT5_LIMIT_POPUP);
    if (popup && !popup.textContent.toLowerCase().includes('you\'ve reached the gpt-5 limit')) return;
    if (!settings.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_LIMIT_CLASS); return;
    }
    if (!chrome?.runtime?.id) return;
    if (popup) {
      chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Aurora Extension Error (manageGpt5LimitPopup):", chrome.runtime.lastError.message);
          return;
        }
        if (!result[TIMESTAMP_KEY]) {
          chrome.storage.local.set({ [TIMESTAMP_KEY]: Date.now() }, () => {
            if (chrome.runtime.lastError) {
              console.error("Aurora Extension Error (manageGpt5LimitPopup):", chrome.runtime.lastError.message);
            }
          });
        } else if (Date.now() - result[TIMESTAMP_KEY] > FIVE_MINUTES_MS) {
          popup.classList.add(HIDE_LIMIT_CLASS);
        }
      });
    } else {
      chrome.storage.local.remove([TIMESTAMP_KEY], () => {
        if (chrome.runtime.lastError) {
          console.error("Aurora Extension Error (manageGpt5LimitPopup):", chrome.runtime.lastError.message);
        }
      });
    }
  }

function manageUpgradeButtons() {
    const upgradeElements = [];

    const panelButton = Array.from(document.querySelectorAll(SELECTORS.UPGRADE_MENU_ITEM)).find(el => el.textContent.toLowerCase().includes('upgrade'));
    upgradeElements.push(panelButton);

    const topButtonContainer = document.querySelector(SELECTORS.UPGRADE_TOP_BUTTON_CONTAINER);
    upgradeElements.push(topButtonContainer);

    const profileButtonUpgrade = document.querySelector(SELECTORS.UPGRADE_PROFILE_BUTTON_TRAILING_ICON);
    upgradeElements.push(profileButtonUpgrade);
    
    const newSidebarUpgradeButton = Array.from(document.querySelectorAll(SELECTORS.UPGRADE_SIDEBAR_BUTTON)).find(el => el.textContent.toLowerCase().includes('upgrade'));
    upgradeElements.push(newSidebarUpgradeButton);
    
    const tinySidebarUpgradeIcon = document.querySelector(SELECTORS.UPGRADE_TINY_SIDEBAR_ICON);
    upgradeElements.push(tinySidebarUpgradeIcon);

    const bottomBannerUpgrade = Array.from(document.querySelectorAll(SELECTORS.UPGRADE_BOTTOM_BANNER))
      .find(el => el.textContent?.toLowerCase().includes('upgrade your plan'));
    if (bottomBannerUpgrade) {
      // The element to hide is the parent container of the button.
      upgradeElements.push(bottomBannerUpgrade.parentElement);
    }

    const allSettingRows = document.querySelectorAll(SELECTORS.UPGRADE_SETTINGS_ROW_CONTAINER);
    for (const row of allSettingRows) {
        const rowText = row.textContent || '';
        const hasUpgradeTitle = rowText.includes('Get ChatGPT Plus') || rowText.includes('Get ChatGPT Go');
        const hasUpgradeButton = Array.from(row.querySelectorAll('button')).some(btn => btn.textContent.trim() === 'Upgrade');

        if (hasUpgradeTitle && hasUpgradeButton) {
            upgradeElements.push(row);
        }
    }

    toggleClassForElements(upgradeElements, HIDE_UPGRADE_CLASS, settings.hideUpgradeButtons);
  }

  function manageSidebarButtons() {
    toggleClassForElements([document.getElementById(SELECTORS.SORA_BUTTON_ID)], HIDE_SORA_CLASS, settings.hideSoraButton);
    toggleClassForElements([document.querySelector(SELECTORS.GPTS_BUTTON)], HIDE_GPTS_CLASS, settings.hideGptsButton);
  }

  const isChatPage = () => location.pathname.startsWith('/c/');

  function ensureAppOnTop() {
    const app = document.getElementById('__next') || document.querySelector('#root') || document.querySelector('main') || document.body.firstElementChild;
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

    const createLayerContent = () => `
      <div class="animated-bg">
        <div class="blob"></div><div class="blob"></div><div class="blob"></div>
      </div>
      <video playsinline autoplay muted loop></video>
      <picture>
        <source type="image/webp" srcset="">
        <img alt="" aria-hidden="true" sizes="100vw" loading="eager" fetchpriority="high" src="" srcset="">
      </picture>
    `;

    wrap.innerHTML = `
      <div class="media-layer active" data-layer-id="a">${createLayerContent()}</div>
      <div class="media-layer" data-layer-id="b">${createLayerContent()}</div>
      <div class="haze"></div>
      <div class="overlay"></div>
    `;
    return wrap;
  }
  
  let activeLayerId = 'a';
  let isTransitioning = false;

  function updateBackgroundImage() {
    const bgNode = document.getElementById(ID);
    if (!bgNode || isTransitioning) return;

    const url = settings.customBgUrl;
    const inactiveLayerId = activeLayerId === 'a' ? 'b' : 'a';
    const activeLayer = bgNode.querySelector(`.media-layer[data-layer-id="${activeLayerId}"]`);
    const inactiveLayer = bgNode.querySelector(`.media-layer[data-layer-id="${inactiveLayerId}"]`);

    if (!activeLayer || !inactiveLayer) return;

    // --- Prepare inactive layer for new content ---
    inactiveLayer.classList.remove('gpt5-active');
    const inactiveImg = inactiveLayer.querySelector('img');
    const inactiveSource = inactiveLayer.querySelector('source');
    const inactiveVideo = inactiveLayer.querySelector('video');

    const transitionToInactive = () => {
      isTransitioning = true;
      inactiveLayer.classList.add('active');
      activeLayer.classList.remove('active');
      activeLayerId = inactiveLayerId;
      // Wait for CSS transition to complete + buffer
      setTimeout(() => { isTransitioning = false; }, 800);
    };

    // --- Handle different background types ---
    if (url === '__gpt5_animated__') {
      inactiveLayer.classList.add('gpt5-active');
      transitionToInactive();
      return;
    }

    const defaultWebpSrcset = `https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w`;
    const defaultImgSrc = "https://persistent.oaistatic.com/burrito-nux/640.webp";
    const videoExtensions = ['.mp4', '.webm', '.ogv'];

    const applyMedia = (mediaUrl) => {
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext)) || mediaUrl.startsWith('data:video');
      inactiveImg.style.display = isVideo ? 'none' : 'block';
      inactiveVideo.style.display = isVideo ? 'block' : 'none';

      const mediaEl = isVideo ? inactiveVideo : inactiveImg;
      const eventType = isVideo ? 'loadeddata' : 'load';

      const onMediaReady = () => {
        transitionToInactive();
        mediaEl.removeEventListener(eventType, onMediaReady);
        mediaEl.removeEventListener('error', onMediaReady); // Also clean up error handler
      };

      mediaEl.addEventListener(eventType, onMediaReady, { once: true });
      // If media fails to load, still perform transition to avoid getting stuck
      mediaEl.addEventListener('error', onMediaReady, { once: true });

      if (isVideo) {
        inactiveVideo.src = mediaUrl;
        inactiveVideo.load();
        inactiveVideo.play().catch(e => {}); // Autoplay might be blocked by browser
        inactiveImg.src = ''; inactiveImg.srcset = ''; inactiveSource.srcset = '';
      } else {
        inactiveImg.src = mediaUrl; inactiveImg.srcset = ''; inactiveSource.srcset = '';
        inactiveVideo.src = '';
      }
    };

    const applyDefault = () => {
      inactiveImg.style.display = 'block';
      inactiveVideo.style.display = 'none';
      inactiveVideo.src = '';

      const onMediaReady = () => {
        transitionToInactive();
        inactiveImg.removeEventListener('load', onMediaReady);
        inactiveImg.removeEventListener('error', onMediaReady);
      };
      inactiveImg.addEventListener('load', onMediaReady, { once: true });
      inactiveImg.addEventListener('error', onMediaReady, { once: true });

      inactiveImg.src = defaultImgSrc;
      inactiveImg.srcset = defaultWebpSrcset;
      inactiveSource.srcset = defaultWebpSrcset;
    };

    if (url) {
      if (url === '__local__') {
        if (chrome?.runtime?.id && chrome?.storage?.local) {
          chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
            if (chrome.runtime.lastError || !res || !res[LOCAL_BG_KEY]) {
              console.error("Aurora Extension Error (updateBackgroundImage):", chrome.runtime.lastError?.message || 'Local BG not found.');
              applyDefault();
            } else {
              applyMedia(res[LOCAL_BG_KEY]);
            }
          });
        } else {
          applyDefault();
        }
      } else {
        applyMedia(url);
      }
    } else {
      applyDefault();
    }
  }

  function applyCustomStyles() {
    const ensureAndApply = () => {
      let styleNode = document.getElementById(STYLE_ID);
      if (!styleNode) {
        styleNode = document.createElement('style');
        styleNode.id = STYLE_ID;
        (document.head || document.documentElement || document.body)?.appendChild(styleNode);
      }
      const blurPx = `${settings.backgroundBlur || '60'}px`;
      const scaling = settings.backgroundScaling || 'contain';
      styleNode.textContent = `
        #${ID} img, #${ID} video {
          --cgpt-bg-blur-radius: ${blurPx};
          object-fit: ${scaling};
        }
        #${ID} {
          opacity: 0;
          transition: opacity 500ms ease-in-out;
        }
        #${ID}.bg-visible {
          opacity: 1;
        }
        .${BG_ANIM_DISABLED_CLASS} #${ID} {
            transition: none !important;
        }
      `;
    };
    if (!document.head && !document.body) {
      document.addEventListener('DOMContentLoaded', ensureAndApply, { once: true });
      return;
    }
    ensureAndApply();
  }

  let qsInitScheduled = false;

  function setupQuickSettingsToggles(settings) {
    const toggleConfig = [
      { id: 'qs-focusMode', key: 'focusMode' },
      { id: 'qs-hideUpgradeButtons', key: 'hideUpgradeButtons' },
      { id: 'qs-hideGptsButton', key: 'hideGptsButton' },
      { id: 'qs-cuteVoiceUI', key: 'cuteVoiceUI' },
    ];

    toggleConfig.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = !!settings[key];
        el.addEventListener('change', () => {
          chrome.storage.sync.set({ [key]: el.checked });
        });
      }
    });
  }

  function setupQuickSettingsVoiceSelector(settings) {
    const voiceColorOptions = [
      { value: 'default', labelKey: 'voiceColorOptionDefault', color: '#8EBBFF' },
      { value: 'orange', labelKey: 'voiceColorOptionOrange', color: '#FF9900' },
      { value: 'yellow', labelKey: 'voiceColorOptionYellow', color: '#FFD700' },
      { value: 'pink', labelKey: 'voiceColorOptionPink', color: '#FF69B4' },
      { value: 'green', labelKey: 'voiceColorOptionGreen', color: '#32CD32' },
      { value: 'dark', labelKey: 'voiceColorOptionDark', color: '#555555' }
    ];
    const selectContainer = document.getElementById('qs-voice-color-select');
    if (!selectContainer) return;

    const trigger = selectContainer.querySelector('.qs-select-trigger');
    const optionsContainer = selectContainer.querySelector('.qs-select-options');
    const triggerDot = trigger.querySelector('.qs-color-dot');
    const triggerLabel = trigger.querySelector('.qs-select-label');

    const resolveVoiceLabel = (option) => getMessage(option.labelKey);

    const renderVoiceOptions = (selectedValue) => {
      optionsContainer.innerHTML = voiceColorOptions.map(option => `
        <div class="qs-select-option" role="option" data-value="${option.value}" aria-selected="${option.value === selectedValue}">
            <span class="qs-color-dot" style="background-color: ${option.color};"></span>
            <span class="qs-select-label">${resolveVoiceLabel(option)}</span>
            <svg class="qs-checkmark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `).join('');
      optionsContainer.querySelectorAll('.qs-select-option').forEach(optionEl => {
        optionEl.addEventListener('click', () => {
          const newValue = optionEl.dataset.value;
          chrome.storage.sync.set({ voiceColor: newValue });
          trigger.setAttribute('aria-expanded', 'false');
          optionsContainer.style.display = 'none';
        });
      });
    };

    const updateSelectorState = (value) => {
      const selectedOption = voiceColorOptions.find(opt => opt.value === value) || voiceColorOptions[0];
      triggerDot.style.backgroundColor = selectedOption.color;
      triggerLabel.textContent = resolveVoiceLabel(selectedOption);
      renderVoiceOptions(value);
    };

    updateSelectorState(settings.voiceColor);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isExpanded));
      optionsContainer.style.display = isExpanded ? 'none' : 'block';
    });
  }

  function manageQuickSettingsUI() {
    if (!document.body) {
      if (!qsInitScheduled) {
        qsInitScheduled = true;
        document.addEventListener('DOMContentLoaded', () => { qsInitScheduled = false; manageQuickSettingsUI(); }, { once: true });
      }
      return;
    }
    let btn = document.getElementById(QS_BUTTON_ID);
    let panel = document.getElementById(QS_PANEL_ID);

    if (!btn) {
      btn = document.createElement('button');
      btn.id = QS_BUTTON_ID;
      btn.title = getMessage('quickSettingsButtonTitle');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.65 19.5 12.33 19.5 12S19.47 11.35 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.35 4.5 11.67 4.5 12S4.53 12.65 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.04 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"></path></svg>`;
      document.body.appendChild(btn);

      panel = document.createElement('div');
      panel.id = QS_PANEL_ID;
      document.body.appendChild(panel);

      // --- NEW: STATE-DRIVEN ANIMATION LOGIC ---
      panel.setAttribute('data-state', 'closed');
      const openPanel = () => panel.setAttribute('data-state', 'open');
      const closePanel = () => panel.setAttribute('data-state', 'closing');

      panel.addEventListener('animationend', (e) => {
        if (e.animationName === 'qs-panel-close' && panel.getAttribute('data-state') === 'closing') {
          panel.setAttribute('data-state', 'closed');
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const state = panel.getAttribute('data-state');
        if (state === 'closed') {
          openPanel();
        } else if (state === 'open') {
          closePanel();
        }
      });

      document.addEventListener('click', (e) => {
        if (panel && !panel.contains(e.target) && panel.getAttribute('data-state') === 'open') {
          closePanel();
        }
        const selectContainer = document.getElementById('qs-voice-color-select');
        if (selectContainer && !selectContainer.contains(e.target)) {
            const selectTrigger = selectContainer.querySelector('.qs-select-trigger');
            if (selectTrigger && selectTrigger.getAttribute('aria-expanded') === 'true') {
                const selectOptions = selectContainer.querySelector('.qs-select-options');
                selectTrigger.setAttribute('aria-expanded', 'false');
                if (selectOptions) selectOptions.style.display = 'none';
            }
        }
      });
    }

    panel.innerHTML = `
      <div class="qs-section-title">${getMessage('quickSettingsSectionVisibility')}</div>
      <div class="qs-row" data-setting="focusMode">
          <label>${getMessage('labelFocusMode')}</label>
          <label class="switch"><input type="checkbox" id="qs-focusMode"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="hideUpgradeButtons">
          <label>${getMessage('quickSettingsLabelHideUpgradeButtons')}</label>
          <label class="switch"><input type="checkbox" id="qs-hideUpgradeButtons"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="hideGptsButton">
          <label>${getMessage('quickSettingsLabelHideGptsButton')}</label>
          <label class="switch"><input type="checkbox" id="qs-hideGptsButton"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="appearance">
          <label>${getMessage('quickSettingsLabelGlassStyle')}</label>
          <div class="qs-pill-group" role="group" aria-label="${getMessage('quickSettingsLabelGlassStyle')}">
            <button type="button" class="qs-pill" data-appearance="clear">${getMessage('glassAppearanceOptionClear')}</button>
            <button type="button" class="qs-pill" data-appearance="dimmed">${getMessage('glassAppearanceOptionDimmed')}</button>
          </div>
      </div>
      <div class="qs-section-title">${getMessage('quickSettingsSectionVoice')}</div>
      <div class="qs-row" data-setting="voiceColor">
          <label>${getMessage('quickSettingsLabelVoiceColor')}</label>
          <div class="qs-custom-select" id="qs-voice-color-select">
              <button type="button" class="qs-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="qs-color-dot"></span>
                  <span class="qs-select-label"></span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="qs-select-options" role="listbox" style="display: none;"></div>
          </div>
      </div>
      <div class="qs-row" data-setting="cuteVoiceUI">
          <label>${getMessage('quickSettingsLabelCuteVoice')}</label>
          <label class="switch"><input type="checkbox" id="qs-cuteVoiceUI"><span class="track"><span class="thumb"></span></span></label>
      </div>
    `;

    setupQuickSettingsToggles(settings);

    const appearanceButtons = Array.from(panel.querySelectorAll('[data-appearance]'));
    const syncAppearanceButtons = () => {
      appearanceButtons.forEach((btn) => {
        const isActive = (settings.appearance || 'clear') === btn.dataset.appearance;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
    };
    syncAppearanceButtons();
    appearanceButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.appearance;
        chrome.storage.sync.set({ appearance: value });
      });
    });

    setupQuickSettingsVoiceSelector(settings);
  }

  function applyRootFlags() {
    const isUiVisible = shouldShow();
    document.documentElement.classList.toggle(HTML_CLASS, isUiVisible);
    document.documentElement.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    document.documentElement.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
    document.documentElement.classList.toggle(BG_ANIM_DISABLED_CLASS, !!settings.disableBgAnimation);
    document.documentElement.classList.toggle(CLEAR_APPEARANCE_CLASS, settings.appearance === 'clear');
    document.documentElement.classList.toggle('cgpt-cute-voice-on', !!settings.cuteVoiceUI);
    document.documentElement.classList.toggle('cgpt-focus-mode-on', !!settings.focusMode);

    const applyLightMode = (settings.theme === 'light') || (settings.theme === 'auto' && document.documentElement.classList.contains('light'));
    document.documentElement.classList.toggle(LIGHT_CLASS, applyLightMode);

    try {
      if (chrome?.runtime?.id && chrome?.storage?.local) {
        chrome.storage.local.set({ detectedTheme: applyLightMode ? 'light' : 'dark' }, () => {
          if (chrome.runtime.lastError) {
            console.error("Aurora Extension Error (applyRootFlags):", chrome.runtime.lastError.message);
          }
        });
      }
    } catch (e) {
      if (!e.message.toLowerCase().includes('extension context invalidated')) {
        console.error("Aurora Extension Error:", e);
      }
    }

    document.documentElement.setAttribute('data-voice-color', settings.voiceColor || 'default');
  }

  function showBg() {
    let node = document.getElementById(ID);
    if (!node) {
      node = makeBgNode();
      const add = () => {
        document.body.prepend(node);
        ensureAppOnTop();
        applyCustomStyles();
        updateBackgroundImage(); // Initial background set
        setTimeout(() => node.classList.add('bg-visible'), 50);
      };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    } else {
        node.classList.add('bg-visible');
        updateBackgroundImage();
    }
  }

  function hideBg() {
    const node = document.getElementById(ID);
    if (node) {
      node.classList.remove('bg-visible');
    }
  }

  function shouldShow() {
    if (settings.showInNewChatsOnly) {
      return !isChatPage();
    }
    return true;
  }

  function normalizeToken(value) {
    return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function modelTextMatches(text, slug) {
    const normalizedText = normalizeToken(text);
    if (!slug) return false;
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    return hints.some((hint) => normalizedText.includes(normalizeToken(hint)));
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findModelMenu(button) {
    const ariaControls = button?.getAttribute('aria-controls');
    if (ariaControls) {
      const controlled = document.getElementById(ariaControls);
      if (controlled && isElementVisible(controlled)) {
        return controlled;
      }
    }
    const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isElementVisible);
    return menus[menus.length - 1] || null;
  }

  function findMenuOption(menu, slug) {
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    const normalizedHints = hints.map(normalizeToken).filter(Boolean);
    const candidates = Array.from(menu.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button'))
      .filter((el) => isElementVisible(el) && el.closest('[role="menu"]') === menu);

    for (const el of candidates) {
      const text = el.getAttribute('aria-label') || el.textContent || '';
      const normalizedText = normalizeToken(text);
      if (!normalizedText) continue;

      if (slug === 'gpt-5-thinking' && normalizedText.includes('mini')) {
        continue;
      }

      const exactMatch = normalizedHints.find((hint) => normalizedText === hint);
      if (exactMatch) return el;

      const prefixMatch = normalizedHints.find((hint) => normalizedText.startsWith(`${hint} `));
      if (prefixMatch) return el;

      const suffixMatch = normalizedHints.find((hint) => normalizedText.endsWith(` ${hint}`));
      if (suffixMatch) return el;

      const containsMatch = normalizedHints.find((hint) => normalizedText.includes(hint));
      if (containsMatch) {
        return el;
      }
    }
    return null;
  }

  async function openLegacyMenuIfNeeded(currentMenu) {
    const legacyTrigger = Array.from(currentMenu.querySelectorAll('[role="menuitem"], button'))
      .find((el) => isElementVisible(el) && normalizeToken(el.textContent || '').includes('legacy models'));
    if (!legacyTrigger) return currentMenu;

    const pointerInit = { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    try { legacyTrigger.dispatchEvent(new PointerEvent('pointerover', pointerInit)); } catch (e) {}
    try { legacyTrigger.dispatchEvent(new PointerEvent('pointerenter', pointerInit)); } catch (e) {}
    legacyTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    legacyTrigger.focus();
    legacyTrigger.click();

    const submenu = await waitFor(() => {
      const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isElementVisible);
      return menus.length > 1 ? menus[menus.length - 1] : null;
    }, 800);

    return submenu || currentMenu;
  }

  function waitFor(getter, timeout = 1200) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const value = typeof getter === 'function' ? getter() : document.querySelector(getter);
        if (value) {
          resolve(value);
          return;
        }
        if (performance.now() - start >= timeout) {
          resolve(null);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function applyDefaultModelOnce(slug) {
    const button = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    if (!button) return false;

    const currentLabel = button.getAttribute('aria-label') || button.textContent || '';
    if (modelTextMatches(currentLabel, slug)) {
      lastDefaultModelApplied = slug;
      return true;
    }

    applyingDefaultModel = true;
    try {
      if (button.getAttribute('aria-expanded') !== 'true') {
        button.click();
      }

      let menu = await waitFor(() => findModelMenu(button), 1200);
      if (!menu) {
        return false;
      }

      if (LEGACY_MODEL_SLUGS.has(slug)) {
        const legacyMenu = await openLegacyMenuIfNeeded(menu);
        if (legacyMenu) {
          menu = legacyMenu;
        }
      }

      const option = findMenuOption(menu, slug);
      if (!option) {
        return false;
      }

      option.click();
      lastDefaultModelApplied = slug;
      return true;
    } finally {
      applyingDefaultModel = false;
      requestAnimationFrame(() => {
        if (button.getAttribute('aria-expanded') === 'true') {
          button.click();
        }
      });
    }
  }

  function maybeApplyDefaultModel(force = false) {
    const slug = (settings.defaultModel || '').trim();
    if (!slug) {
      lastDefaultModelApplied = null;
      modelApplyCooldownUntil = 0;
      return;
    }

    if (!force && Date.now() < modelApplyCooldownUntil) return;
    if (applyingDefaultModel || defaultModelApplyPromise) return;

    const attempt = async (remaining) => {
      const success = await applyDefaultModelOnce(slug);
      if (success) {
        modelApplyCooldownUntil = Date.now() + 1500;
        return true;
      }
      if (remaining <= 0) {
        modelApplyCooldownUntil = Date.now() + 6000;
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      return attempt(remaining - 1);
    };

    defaultModelApplyPromise = attempt(2).finally(() => {
      defaultModelApplyPromise = null;
    });
  }

  function applyAllSettings() {
    if (shouldShow()) {
      showBg();
    } else {
      hideBg();
    }

    if (shouldShow() && !settings.hideQuickSettings) {
      manageQuickSettingsUI();
    } else {
      const btn = document.getElementById(QS_BUTTON_ID);
      const panel = document.getElementById(QS_PANEL_ID);
      if (btn) btn.remove();
      if (panel) panel.remove();
    }

    applyRootFlags();
    applyCustomStyles();
    updateBackgroundImage();
    manageGpt5LimitPopup();
    manageUpgradeButtons();
    manageSidebarButtons();
    maybeApplyDefaultModel();
  }

  let observersStarted = false;
  function startObservers() {
    if (observersStarted) return;
    observersStarted = true;
    
    // Performance: Pause animations and video when tab is not visible.
    document.addEventListener('visibilitychange', () => {
      const bgNode = document.getElementById(ID);
      document.documentElement.classList.toggle('cgpt-tab-hidden', document.hidden);
      if (!bgNode) return;
      
      const videos = bgNode.querySelectorAll('video');
      videos.forEach(video => {
        if (document.hidden) {
          video.pause();
        } else {
          // Only play if it's supposed to be playing
          if (video.style.display !== 'none') {
            video.play().catch(e => { /* Autoplay might be blocked by browser policies */ });
          }
        }
      });
    }, { passive: true });

    const uiReadyObserver = new MutationObserver((mutations, obs) => {
      const stableUiElement = document.querySelector(SELECTORS.PROFILE_BUTTON);
      if (stableUiElement) {
        applyAllSettings();
        obs.disconnect();
      }
    });

    uiReadyObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('focus', applyAllSettings, { passive: true });
    let lastUrl = location.href;
    const checkUrl = () => { if (location.href === lastUrl) return; lastUrl = location.href; applyAllSettings(); };
    window.addEventListener('popstate', checkUrl, { passive: true });
    const originalPushState = history.pushState;
    history.pushState = function(...args) { originalPushState.apply(this, args); setTimeout(checkUrl, 0); };
    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) { originalReplaceState.apply(this, args); setTimeout(checkUrl, 0); };

    // For performance, debounce less-critical UI checks that don't cause flicker.
    const debouncedOtherChecks = debounce(() => {
      manageGpt5LimitPopup();
      manageSidebarButtons();
      maybeApplyDefaultModel();
    }, 150);

    // This observer handles all dynamic UI changes.
    const domObserver = new MutationObserver(() => {
      // Run the upgrade button check immediately on every DOM change to prevent the menu item from flickering.
      manageUpgradeButtons();
      
      // Run the less-critical checks on a debounce timer.
      debouncedOtherChecks();
    });
    
    domObserver.observe(document.body, { childList: true, subtree: true });

    const themeObserver = new MutationObserver(() => { if (settings.theme === 'auto') applyRootFlags(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function applyWelcomePreviewSettings(changedKey) {
    if (changedKey === 'customBgUrl') {
      updateBackgroundImage();
    }
    applyRootFlags();
  }

  const getWelcomeScreenHTML = () => `
    <div id="aurora-welcome-overlay">
        <div class="welcome-container">
            <!-- Screen 1: Introduction -->
            <div id="screen-1" class="screen active">
                <div class="content-panel">
                    <div class="logo">✨</div>
                    <h1>${getMessage('welcomeTitle')}</h1>
                    <p>${getMessage('welcomeDescription')}</p>
                    <button id="get-started-btn" class="welcome-btn primary">${getMessage('welcomeBtnGetStarted')}</button>
                </div>
            </div>
        </div>

        <!-- Bar 1: Style Setup -->
        <div id="aurora-style-bar" class="aurora-setup-bar">
            <div class="setup-section">
                <label class="section-label">${getMessage('welcomeLabelBgPreset')}</label>
                <div class="preset-grid">
                    <button class="preset-tile" data-bg-url="default">
                        <div class="preview default"></div>
                        <span>${getMessage('welcomePresetDefault')}</span>
                    </button>
                    <button class="preset-tile" data-bg-url="__gpt5_animated__">
                        <div class="preview animated"></div>
                        <span>${getMessage('welcomePresetAnimated')}</span>
                    </button>
                    <button class="preset-tile" data-bg-url="grokHorizon">
                        <div class="preview grok"></div>
                        <span>${getMessage('welcomePresetHorizon')}</span>
                    </button>
                    <button class="preset-tile" data-bg-url="blue">
                        <div class="preview blue"></div>
                        <span>${getMessage('welcomePresetBlue')}</span>
                    </button>
                </div>
            </div>
            <div class="setup-section">
                <label class="section-label">${getMessage('welcomeLabelGlassStyle')}</label>
                <div class="pill-group">
                    <button class="pill-btn" data-appearance="clear">${getMessage('welcomeGlassClear')}</button>
                    <button class="pill-btn" data-appearance="dimmed">${getMessage('welcomeGlassDimmed')}</button>
                </div>
            </div>
            <button id="next-btn" class="welcome-btn primary finish-button">${getMessage('welcomeBtnNext')}</button>
        </div>

        <!-- Bar 2: Voice Setup -->
        <div id="aurora-voice-bar" class="aurora-setup-bar">
            <div class="setup-section voice-header">
                <label class="section-label">${getMessage('welcomeLabelVoice')}</label>
                <span class="listen-text">${getMessage('welcomeBtnListen')}</span>
            </div>
            <div class="setup-section voice-controls">
                <div class="pill-group" id="voice-color-pills">
                    <!-- Voice color pills will be injected here -->
                </div>
                <div class="cute-ui-control">
                    <label>${getMessage('labelCuteVoice')}</label>
                    <label class="switch"><input type="checkbox" id="welcome-cuteVoiceUI"><span class="track"><span class="thumb"></span></span></label>
                </div>
            </div>
            <button id="finish-btn" class="welcome-btn primary finish-button">${getMessage('welcomeBtnFinish')}</button>
        </div>
    </div>
  `;

  function showWelcomeScreen() {
    const welcomeNode = document.createElement('div');
    welcomeNode.innerHTML = getWelcomeScreenHTML();
    if (welcomeNode.firstElementChild) {
      document.body.appendChild(welcomeNode.firstElementChild);
    }

    // Get all elements at once
    const getStartedBtn = document.getElementById('get-started-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const welcomeOverlay = document.getElementById('aurora-welcome-overlay');
    const welcomeContainer = document.querySelector('.welcome-container');
    const styleBar = document.getElementById('aurora-style-bar');
    const voiceBar = document.getElementById('aurora-voice-bar');
    const welcomeCuteVoiceUIToggle = document.getElementById('welcome-cuteVoiceUI');
    
    let tempSettings = { ...settings }; // Clone settings for preview

    // --- Event Listeners ---
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
          if (welcomeOverlay) {
            welcomeOverlay.classList.add('setup-active');
          }

          if (welcomeContainer) {
              // Fade out the main modal, then show the first setup bar
              setTimeout(() => {
                  welcomeContainer.style.display = 'none';
                  if (styleBar) styleBar.classList.add('active');
              }, 400); 
          } else {
            if (styleBar) styleBar.classList.add('active');
          }

          // Initialize with defaults visually
          document.querySelector('#aurora-style-bar .preset-tile[data-bg-url="default"]').classList.add('active');
          document.querySelector('#aurora-style-bar .pill-btn[data-appearance="clear"]').classList.add('active');
      });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (styleBar) styleBar.classList.remove('active');
            // This click reveals the voice UI on the main page for live preview
            document.querySelector('[data-testid="composer-speech-button"]')?.click();

            setTimeout(() => {
                if(voiceBar) voiceBar.classList.add('active');
            }, 500); 
        });
    }

    // --- Dynamic Voice Color Pills ---
    const voiceColorOptions = [
        { value: 'default', color: '#8EBBFF' }, { value: 'orange', color: '#FF9900' },
        { value: 'yellow', color: '#FFD700' }, { value: 'pink', color: '#FF69B4' },
        { value: 'green', color: '#32CD32' }, { value: 'dark', color: '#555555' }
    ];
    const voicePillsContainer = document.getElementById('voice-color-pills');
    if (voicePillsContainer) {
        voiceColorOptions.forEach(opt => {
            const pill = document.createElement('button');
            pill.className = 'pill-btn voice-pill';
            pill.dataset.value = opt.value;
            pill.innerHTML = `<span class="qs-color-dot" style="background-color: ${opt.color};"></span>`;
            
            pill.addEventListener('click', () => {
                voicePillsContainer.querySelectorAll('.voice-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                tempSettings.voiceColor = opt.value;
                settings.voiceColor = opt.value; // for live preview
                applyAllSettings(); // Use full apply for robust preview
            });
            voicePillsContainer.appendChild(pill);
        });
        // Set default active pill
        const defaultVoicePill = voicePillsContainer.querySelector('.voice-pill[data-value="default"]');
        if (defaultVoicePill) defaultVoicePill.classList.add('active');
    }
    
    if (welcomeCuteVoiceUIToggle) {
        welcomeCuteVoiceUIToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            tempSettings.cuteVoiceUI = isChecked;
            settings.cuteVoiceUI = isChecked; // for live preview
            applyAllSettings(); // Use full apply for robust preview
        });
    }

    document.querySelectorAll('#aurora-style-bar .preset-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            document.querySelectorAll('#aurora-style-bar .preset-tile').forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            const bgChoice = tile.dataset.bgUrl;
            let newUrl = '';
            if (bgChoice === 'blue') newUrl = BLUE_WALLPAPER_URL;
            else if (bgChoice === 'grokHorizon') newUrl = GROK_HORIZON_URL;
            else if (bgChoice === '__gpt5_animated__') newUrl = '__gpt5_animated__';
            
            tempSettings.customBgUrl = newUrl;
            settings.customBgUrl = newUrl; // Mutate global settings for live preview
            applyAllSettings();
        });
    });

    document.querySelectorAll('#aurora-style-bar .pill-btn').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#aurora-style-bar .pill-btn').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const appearanceChoice = pill.dataset.appearance;
            tempSettings.appearance = appearanceChoice;
            settings.appearance = appearanceChoice; // Mutate for live preview
            applyAllSettings();
        });
    });

    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
          tempSettings.hasSeenWelcomeScreen = true;
          chrome.storage.sync.set(tempSettings, () => {
              if (chrome.runtime.lastError) {
                  console.error("Aurora Extension Error (Welcome Finish):", chrome.runtime.lastError.message);
                  return;
              }
              if (welcomeOverlay) welcomeOverlay.remove();
          });
      });
    }
  }

  // --- NEW: Initialization and Robust Settings Listener ---
  if (chrome?.runtime?.sendMessage) {
    // This function will be our single point of entry for processing settings updates.
    let welcomeScreenChecked = false;


const refreshSettingsAndApply = () => {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (freshSettings) => {
    if (chrome.runtime.lastError) {
      console.error("Aurora Extension Error: Could not refresh settings.", chrome.runtime.lastError.message);
      return;
    }
    
    // Check if the welcome screen should be shown, but only once.
    if (!welcomeScreenChecked) {
      if (!freshSettings.hasSeenWelcomeScreen) {
        showWelcomeScreen();
      }
      welcomeScreenChecked = true; // Mark as checked for this session.
    }

    // Update the global settings object with the fresh, authoritative state.
    settings = freshSettings;
    // Apply all visual changes based on the new settings.
    applyAllSettings();
  });
};

// Initialize i18n system with ChatGPT language detection
(async () => {
  try {
    if (window.AuroraI18n?.initialize) {
      await window.AuroraI18n.initialize();
      const detectedLocale = window.AuroraI18n.getDetectedLocale();
      console.log(`Aurora: Language system initialized with locale: ${detectedLocale}`);
    }
  } catch (e) {
    console.warn('Aurora: Could not initialize i18n system, using browser default:', e);
  }
})();

    // Initial load when the script first runs.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        refreshSettingsAndApply();
        startObservers();
      }, { once: true });
    } else {
      refreshSettingsAndApply();
      startObservers();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        const changedKeys = Object.keys(changes);
        const backgroundKeys = ['customBgUrl', 'backgroundBlur', 'backgroundScaling'];
        const isOnlyNonBackgroundChange = changedKeys.every(key => !backgroundKeys.includes(key));

        if (isOnlyNonBackgroundChange && changedKeys.length > 0) {
          // Lightweight update for non-background settings
          chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (freshSettings) => {
            if (chrome.runtime.lastError) {
              console.error("Aurora Extension Error: Could not refresh settings for lightweight update.", chrome.runtime.lastError.message);
              return;
            }
            settings = freshSettings;
            
            // Apply only the necessary, non-background updates
            applyRootFlags();
            manageGpt5LimitPopup();
            manageUpgradeButtons();
            manageSidebarButtons();
            if (shouldShow() && !settings.hideQuickSettings) {
                manageQuickSettingsUI();
            }
            maybeApplyDefaultModel();
          });
        } else {
          // Full refresh for background changes or mixed changes
          refreshSettingsAndApply();
        }
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        refreshSettingsAndApply();
      }
    });
  }
})()