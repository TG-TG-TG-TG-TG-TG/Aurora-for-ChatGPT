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
  const CLEAR_APPEARANCE_CLASS = 'cgpt-appearance-clear';
  let settings = {};
  let lastDefaultModelApplied = null;
  let modelApplyCooldownUntil = 0;
  let defaultModelApplyPromise = null;
  let applyingDefaultModel = false;

  // --- UI Cache Helpers (Moved to global scope for accessibility) ---
  const uiCache = {};
  function getCachedElement(key, queryFn) {
    if (uiCache[key] && uiCache[key].isConnected) {
      return uiCache[key];
    }
    const element = queryFn();
    if (element) uiCache[key] = element;
    return element;
  }

  const LOCAL_BG_KEY = 'customBgData';
  const HIDE_LIMIT_CLASS = 'cgpt-hide-gpt5-limit';
  const HIDE_UPGRADE_CLASS = 'cgpt-hide-upgrade';
  const TIMESTAMP_KEY = 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
  const GROK_HORIZON_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Aurora/grok-4.webp') : 'Aurora/grok-4.webp';
  const SANTA_HAT_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('santa_hat_cutout_v2.png') : 'santa_hat_cutout_v2.png';
  const CHRISTMAS_BG_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Aurora/christmas-bg.webp') : 'Aurora/christmas-bg.webp';
  const SNOWDRIFT_LEFT_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Left.png') : 'Left.png';
  const SNOWDRIFT_RIGHT_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Right.png') : 'Right.png';
  const CHATGPT_LOGO_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('ChatGPT-Logo.svg.png') : 'ChatGPT-Logo.svg.png';

  // Group DOM selectors for easier maintenance.
  const SELECTORS = {
    GPT5_LIMIT_POPUP: 'div[class*="text-token-text-primary"]',
    UPGRADE_MENU_ITEM: 'a.__menu-item',
    UPGRADE_TOP_BUTTON_CONTAINER: '.start-1\\/2.absolute',
    UPGRADE_PROFILE_BUTTON_TRAILING_ICON: '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn',
    UPGRADE_SIDEBAR_BUTTON: 'div.gap-1\\.5.__menu-item.group',
    UPGRADE_TINY_SIDEBAR_ICON: '#stage-sidebar-tiny-bar > div:nth-of-type(4)',
    UPGRADE_SETTINGS_ROW_CONTAINER: 'div.py-2.border-b',
    UPGRADE_BOTTOM_BANNER: 'div[role="button"]',
    PROFILE_BUTTON: '[data-testid="accounts-profile-button"]',
  };

  const MODEL_LABEL_HINTS = {
    'gpt-5': ['auto', 'gpt-5'],
    'gpt-5-thinking': ['gpt-5 thinking', 'thinking'],
    'gpt-5-thinking-mini': ['thinking mini', 'mini'],
    'gpt-5-thinking-instant': ['instant'],
    'gpt-4o': ['gpt-4o', '4o'],
    'gpt-4.1': ['gpt-4.1', 'gpt 4.1'],
    'o3': ['o3'],
    'o4-mini': ['o4 mini', 'o4-mini'],
    'o1': ['o1'],
    'o1-mini': ['o1 mini', 'o1-mini']
  };

  const LEGACY_MODEL_SLUGS = new Set(['gpt-4o', 'gpt-4.1', 'o3', 'o4-mini', 'o1', 'o1-mini']);

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

  const safeRequestIdleCallback = (callback, options) => {
    if (window.requestIdleCallback) {
        window.requestIdleCallback(callback, options);
    } else {
        setTimeout(callback, 1);
    }
  };

  // Use AuroraI18n for language detection (ChatGPT language priority)
  const getMessage = (key, substitutions) => {
    try {
      if (window.AuroraI18n?.getMessage) {
        const text = window.AuroraI18n.getMessage(key, substitutions);
        if (text && text !== key) return text;
      }
      if (chrome?.i18n?.getMessage && chrome?.runtime?.id) {
        const text = chrome.i18n.getMessage(key, substitutions);
        if (text) return text;
      }
    } catch (e) {
      // Suppress extension context errors
    }
    return key;
  };

  let cachedLimitTimestamp = null;
  let hasCheckedTimestamp = false;
  let isTimestampCleared = false;

  function manageGpt5LimitPopup() {
    const popup = document.querySelector(SELECTORS.GPT5_LIMIT_POPUP);
    const isLimitMsg = popup && popup.textContent.toLowerCase().includes('you\'ve reached the gpt-5 limit');

    // If popup exists but it's not the limit message, ignore it
    if (popup && !isLimitMsg) return;

    // If feature is disabled, just ensure it's visible
    if (!settings.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_LIMIT_CLASS);
      return;
    }

    if (!chrome?.runtime?.id) return;

    if (popup) {
      // Popup IS present
      isTimestampCleared = false; // Reset cleared flag so we clean up later when it disappears

      // If we already have a cached timestamp, use it
      if (cachedLimitTimestamp) {
        if (Date.now() - cachedLimitTimestamp > FIVE_MINUTES_MS) {
          popup.classList.add(HIDE_LIMIT_CLASS);
        }
        return;
      }

      // If we haven't checked storage yet, check it once
      if (!hasCheckedTimestamp) {
        hasCheckedTimestamp = true; // Prevent spamming GET
        chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
          if (chrome.runtime.lastError) {
             hasCheckedTimestamp = false; // Retry next time
             return;
          }
          if (result[TIMESTAMP_KEY]) {
            cachedLimitTimestamp = result[TIMESTAMP_KEY];
             if (Date.now() - cachedLimitTimestamp > FIVE_MINUTES_MS) {
               popup.classList.add(HIDE_LIMIT_CLASS);
             }
          } else {
            // No timestamp exists, set one
            const now = Date.now();
            cachedLimitTimestamp = now;
            chrome.storage.local.set({ [TIMESTAMP_KEY]: now });
          }
        });
      }
    } else {
      // Popup is NOT present
      // Only remove if we haven't already marked it as cleared/removed
      if (!isTimestampCleared) {
        isTimestampCleared = true;
        cachedLimitTimestamp = null;
        hasCheckedTimestamp = false; // Reset so we fetch again next time it appears
        
        // Check if it actually needs removal to avoid IPC if already empty? 
        // Chrome optimizes this but good to be explicit.
        // We just call remove once.
        chrome.storage.local.remove([TIMESTAMP_KEY], () => {
            if (chrome.runtime.lastError) {
                // validation fail or something, reset flag to try again?
                // ignoring for now to avoid loops
            }
        });
      }
    }
  }

  function manageUpgradeButtons() {
    if (!settings.hideUpgradeButtons) {
      const hiddenElements = document.getElementsByClassName(HIDE_UPGRADE_CLASS);
      if (hiddenElements.length > 0) {
        Array.from(hiddenElements).forEach(el => el.classList.remove(HIDE_UPGRADE_CLASS));
      }
      return;
    }

    const upgradeElements = [
      getCachedElement('upgradePanelButton', () => Array.from(document.querySelectorAll(SELECTORS.UPGRADE_MENU_ITEM)).find(el => el.textContent.toLowerCase().includes('upgrade'))),
      getCachedElement('upgradeTopButtonContainer', () => document.querySelector(SELECTORS.UPGRADE_TOP_BUTTON_CONTAINER)),
      getCachedElement('upgradeProfileButton', () => document.querySelector(SELECTORS.UPGRADE_PROFILE_BUTTON_TRAILING_ICON)),
      getCachedElement('upgradeNewSidebarButton', () => Array.from(document.querySelectorAll(SELECTORS.UPGRADE_SIDEBAR_BUTTON)).find(el => el.textContent.toLowerCase().includes('upgrade'))),
      getCachedElement('upgradeTinySidebarIcon', () => document.querySelector(SELECTORS.UPGRADE_TINY_SIDEBAR_ICON)),
      getCachedElement('upgradeBottomBanner', () => {
        const banner = Array.from(document.querySelectorAll(SELECTORS.UPGRADE_BOTTOM_BANNER))
          .find(el => el.textContent?.toLowerCase().includes('upgrade your plan'));
        return banner ? banner.parentElement : null;
      }),
      getCachedElement('upgradeAccountSection', () => {
        const allSettingRows = document.querySelectorAll(SELECTORS.UPGRADE_SETTINGS_ROW_CONTAINER);
        for (const row of allSettingRows) {
          const rowText = row.textContent || '';
          const hasUpgradeTitle = rowText.includes('Get ChatGPT Plus') || rowText.includes('Get ChatGPT Go');
          const hasUpgradeButton = Array.from(row.querySelectorAll('button')).some(btn => btn.textContent.trim() === 'Upgrade');
          if (hasUpgradeTitle && hasUpgradeButton) {
            return row;
          }
        }
        return null;
      }),
      getCachedElement('upgradeGoHeaderButton', () => document.querySelector('.rounded-full.dark\\:bg-\\[\\#373669\\]')),
      getCachedElement('upgradeToGoRobust', () => {
        const allCandidates = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
        const textMatch = allCandidates.find(el => el.textContent.includes('Upgrade to Go'));
        return textMatch ? (textMatch.closest('.rounded-full') || textMatch) : null;
      })
    ];

    toggleClassForElements(upgradeElements.filter(Boolean), HIDE_UPGRADE_CLASS, true);
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
    wrap.style.setProperty('--cgpt-bg-blur-radius', '60px');
    wrap.style.setProperty('--cgpt-object-fit', 'cover');
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

  // ========================================================================
  // BACKGROUND MANAGER - State Machine for Reliable Background Switching
  // ========================================================================
  const BackgroundManager = {
    // State: 'idle' | 'loading' | 'transitioning'
    state: 'idle',
    activeLayerId: 'a',
    currentUrl: null,
    pendingUrl: null,
    abortController: null,
    transitionTimeout: null,
    TRANSITION_MS: 750,
    LOAD_TIMEOUT_MS: 5000,

    // Default background URLs
    DEFAULT_SRCSET: 'https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w',
    DEFAULT_SRC: 'https://persistent.oaistatic.com/burrito-nux/640.webp',
    VIDEO_EXTENSIONS: ['.mp4', '.webm', '.ogv'],

    // Get background container
    getContainer() {
      return document.getElementById(ID);
    },

    // Get layer by ID
    getLayer(layerId) {
      const container = this.getContainer();
      return container?.querySelector(`.media-layer[data-layer-id="${layerId}"]`);
    },

    getActiveLayer() {
      return this.getLayer(this.activeLayerId);
    },

    getInactiveLayer() {
      const inactiveId = this.activeLayerId === 'a' ? 'b' : 'a';
      return this.getLayer(inactiveId);
    },

    // Completely clean a layer of all content and classes
    cleanLayer(layer) {
      if (!layer) return;
      layer.classList.remove('active', 'gpt5-active');
      
      const img = layer.querySelector('img');
      const video = layer.querySelector('video');
      const source = layer.querySelector('source');
      
      if (img) {
        img.src = '';
        img.srcset = '';
        img.style.display = 'none';
      }
      if (video) {
        video.pause();
        video.src = '';
        video.style.display = 'none';
      }
      if (source) {
        source.srcset = '';
      }
    },

    // Abort any pending operation
    abort() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
        this.transitionTimeout = null;
      }
      this.pendingUrl = null;
    },

    // Check if URL is a video
    isVideo(url) {
      if (!url) return false;
      const lower = url.toLowerCase();
      return this.VIDEO_EXTENSIONS.some(ext => lower.includes(ext)) || lower.startsWith('data:video');
    },

    // Load media into a layer, returns Promise
    loadMedia(layer, url) {
      return new Promise((resolve, reject) => {
        if (!layer) {
          reject(new Error('No layer'));
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');
        const isVideoUrl = this.isVideo(url);

        // Set up abort handling
        const abortController = new AbortController();
        this.abortController = abortController;

        // Timeout fallback
        const timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            console.warn('Aurora: Media load timeout, proceeding anyway');
            resolve();
          }
        }, this.LOAD_TIMEOUT_MS);

        const cleanup = () => {
          clearTimeout(timeoutId);
          if (abortController.signal.aborted) {
            reject(new Error('Aborted'));
          }
        };

        if (isVideoUrl) {
          img.style.display = 'none';
          video.style.display = 'block';
          
          const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };
          const onError = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve(); // Still transition on error
          };
          
          video.addEventListener('loadeddata', onReady, { once: true });
          video.addEventListener('error', onError, { once: true });
          video.src = url;
          video.load();
          video.play().catch(() => {}); // Ignore autoplay errors
          
          img.src = '';
          img.srcset = '';
          source.srcset = '';
        } else {
          video.style.display = 'none';
          img.style.display = 'block';
          
          const onReady = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) {
              if (settings.autoContrast && typeof ContrastEngine !== 'undefined') {
                ContrastEngine.analyze(img);
              }
              resolve();
            }
          };
          const onError = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };
          
          img.addEventListener('load', onReady, { once: true });
          img.addEventListener('error', onError, { once: true });
          img.src = url;
          img.srcset = '';
          source.srcset = '';
          
          video.src = '';
        }
      });
    },

    // Load default background
    loadDefault(layer) {
      return new Promise((resolve) => {
        if (!layer) {
          resolve();
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');

        video.style.display = 'none';
        video.src = '';
        img.style.display = 'block';

        const onReady = () => {
          img.removeEventListener('load', onReady);
          img.removeEventListener('error', onReady);
          if (settings.autoContrast && typeof ContrastEngine !== 'undefined') {
            ContrastEngine.analyze(img);
          }
          resolve();
        };

        img.addEventListener('load', onReady, { once: true });
        img.addEventListener('error', onReady, { once: true });
        
        img.src = this.DEFAULT_SRC;
        img.srcset = this.DEFAULT_SRCSET;
        source.srcset = this.DEFAULT_SRCSET;
      });
    },

    // Perform crossfade transition
    crossfade(toLayer, fromLayer) {
      return new Promise((resolve) => {
        if (!toLayer || !fromLayer) {
          resolve();
          return;
        }

        // Use transitionend for reliable timing
        const onTransitionEnd = (e) => {
          if (e.propertyName === 'opacity' && e.target === toLayer) {
            toLayer.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
            resolve();
          }
        };

        // Fallback timeout in case transitionend doesn't fire
        this.transitionTimeout = setTimeout(() => {
          toLayer.removeEventListener('transitionend', onTransitionEnd);
          this.transitionTimeout = null;
          resolve();
        }, this.TRANSITION_MS + 100);

        toLayer.addEventListener('transitionend', onTransitionEnd);

        // Trigger the transition
        requestAnimationFrame(() => {
          toLayer.classList.add('active');
          fromLayer.classList.remove('active');
        });
      });
    },

    // Main switch function
    async switchTo(url) {
      // If we're busy and get a new request, queue it
      if (this.state !== 'idle') {
        this.pendingUrl = url;
        this.abort();
        // Small delay to let abort complete
        await new Promise(r => setTimeout(r, 50));
      }

      // Skip if same URL
      if (url === this.currentUrl && this.state === 'idle') {
        return;
      }

      const container = this.getContainer();
      if (!container) return;

      const activeLayer = this.getActiveLayer();
      const inactiveLayer = this.getInactiveLayer();
      if (!activeLayer || !inactiveLayer) return;

      try {
        this.state = 'loading';

        // Clean inactive layer completely before loading new content
        this.cleanLayer(inactiveLayer);

        // Handle animated gradient (GPT-5 style)
        if (url === '__gpt5_animated__') {
          inactiveLayer.classList.add('gpt5-active');
          // No media to load, just transition
        } else if (url === '__local__') {
          // Load from local storage
          if (chrome?.runtime?.id && chrome?.storage?.local) {
            const localData = await new Promise((resolve) => {
              chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
                if (chrome.runtime.lastError || !res || !res[LOCAL_BG_KEY]) {
                  resolve(null);
                } else {
                  resolve(res[LOCAL_BG_KEY]);
                }
              });
            });
            
            if (localData) {
              await this.loadMedia(inactiveLayer, localData);
            } else {
              await this.loadDefault(inactiveLayer);
            }
          } else {
            await this.loadDefault(inactiveLayer);
          }
        } else if (url) {
          // Custom URL
          await this.loadMedia(inactiveLayer, url);
        } else {
          // Default/no URL
          await this.loadDefault(inactiveLayer);
        }

        // Perform crossfade
        this.state = 'transitioning';
        await this.crossfade(inactiveLayer, activeLayer);

        // Clean old layer completely (removes gpt5-active if it was set)
        this.cleanLayer(activeLayer);

        // Update state
        this.activeLayerId = inactiveLayer.dataset.layerId;
        this.currentUrl = url;
        this.state = 'idle';

        // Check for pending request
        if (this.pendingUrl !== null) {
          const pending = this.pendingUrl;
          this.pendingUrl = null;
          this.switchTo(pending);
        }
      } catch (err) {
        // On error or abort, reset to idle
        this.state = 'idle';
        if (err.message !== 'Aborted') {
          console.error('Aurora BG switch error:', err);
        }
      }
    },

    // Trigger update from settings
    update() {
      this.switchTo(settings.customBgUrl);
    }
  };

  // Wrapper function for backward compatibility
  function updateBackgroundImage() {
    BackgroundManager.update();
  }

  function applyCustomStyles() {
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;

    const blurPx = `${settings.backgroundBlur || '60'}px`;
    const scaling = settings.backgroundScaling || 'cover';
    
    // Apply dynamic values directly to the container
    bgNode.style.setProperty('--cgpt-bg-blur-radius', blurPx);
    // Used in CSS via var(--cgpt-object-fit)
    bgNode.style.setProperty('--cgpt-object-fit', scaling);
    
    // Static styles moved to styles.css
  }

  let qsInitScheduled = false;


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
    if (!trigger || !optionsContainer) return;

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
      const selectedOption = voiceColorOptions.find(opt => opt.value === value) || voiceColorOptions;
      if (triggerDot) triggerDot.style.backgroundColor = selectedOption.color;
      if (triggerLabel) triggerLabel.textContent = resolveVoiceLabel(selectedOption);
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
    <div class="qs-row" data-setting="blurChatHistory">
        <label>${getMessage('quickSettingsLabelStreamerMode')}</label>
        <label class="switch"><input type="checkbox" id="qs-blurChatHistory"><span class="track"><span class="thumb"></span></span></label>
    </div>
      <div class="qs-section-title">${getMessage('sectionHolidayEffects')}</div>
      <div class="qs-row qs-holiday-mode" data-setting="holidayMode">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🎄</span>
            <label>${getMessage('labelHolidayMode')}</label>
        </div>
        <label class="switch"><input type="checkbox" id="qs-holidayMode"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="enableSnowfall">
        <div style="display: flex; align-items: center; gap: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>
            <label>${getMessage('labelSnowfall')}</label>
        </div>
        <label class="switch"><input type="checkbox" id="qs-enableSnowfall"><span class="track"><span class="thumb"></span></span></label>
    </div>
      <div class="qs-row" data-setting="enableNewYear">
          <label>${getMessage('labelNewYear')}</label>
          <label class="switch"><input type="checkbox" id="qs-enableNewYear"><span class="track"><span class="thumb"></span></span></label>
      </div>
    <div class="qs-section-title">${getMessage('sectionAppearance')}</div>
      <div class="qs-row" data-setting="appearance">
          <label>${getMessage('quickSettingsLabelGlassStyle')}</label>
          <div class="aurora-glass-switch" id="qs-appearance-toggle" data-switch-state="${(settings.appearance === 'dimmed') ? '1' : '0'}">
            <div class="aurora-switch-glider"></div>
            <!-- Data-value 0 corresponds to Left state, 1 to Right state -->
            <button type="button" class="aurora-switch-btn" data-value="0" data-setting-value="clear">${getMessage('glassAppearanceOptionClear')}</button>
            <button type="button" class="aurora-switch-btn" data-value="1" data-setting-value="dimmed">${getMessage('glassAppearanceOptionDimmed')}</button>
          </div>
      </div>
    `;

    const qsToggles = ['focusMode', 'hideUpgradeButtons', 'cuteVoiceUI', 'blurChatHistory', 'enableSnowfall', 'enableNewYear'];
    qsToggles.forEach((key) => {
      const checkbox = document.getElementById(`qs-${key}`);
      if (checkbox) {
        checkbox.checked = !!settings[key];
        checkbox.addEventListener('change', () => {
          chrome.storage.sync.set({ [key]: checkbox.checked });
        });
      }
    });

    // Holiday Mode toggle (combines snowfall + garland + Christmas background)
    const qsHolidayMode = document.getElementById('qs-holidayMode');
    if (qsHolidayMode) {
      // Set initial state: on if all holiday features are enabled
      const isHolidayMode = settings.enableSnowfall && settings.enableNewYear && 
                            settings.customBgUrl === CHRISTMAS_BG_URL;
      qsHolidayMode.checked = isHolidayMode;
      
      qsHolidayMode.addEventListener('change', () => {
        const isOn = qsHolidayMode.checked;
        chrome.storage.sync.set({
          enableSnowfall: isOn,
          enableNewYear: isOn,
          customBgUrl: isOn ? CHRISTMAS_BG_URL : ''
        });
        // Also update individual toggles visually
        const snowToggle = document.getElementById('qs-enableSnowfall');
        const yearToggle = document.getElementById('qs-enableNewYear');
        if (snowToggle) snowToggle.checked = isOn;
        if (yearToggle) yearToggle.checked = isOn;
      });
    }

    setupQuickSettingsVoiceSelector(settings);

    // Sync Appearance Segmented Control
    const appearanceToggle = document.getElementById('qs-appearance-toggle');
    if (appearanceToggle) {
      // Update visual state
      const currentAppearance = settings.appearance || 'clear';
      appearanceToggle.setAttribute('data-switch-state', currentAppearance === 'dimmed' ? '1' : '0');

      // Add listeners (only needed once if inside the `if (!btn)` block, otherwise check for duplicates)
      // Since we are replacing logic, ensure this runs. 
      // Ideally, put this listener attachment inside the `if (!btn) { ... }` block to avoid duplicates.
      const segmentBtns = appearanceToggle.querySelectorAll('.aurora-switch-btn');
      segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const settingValue = btn.dataset.settingValue;
          const switchState = btn.dataset.value;

          // Add temporary class to enable smooth theme transitions
          document.documentElement.classList.add('cgpt-theme-transitioning');
          if (window._auroraThemeTimer) clearTimeout(window._auroraThemeTimer);
          window._auroraThemeTimer = setTimeout(() => {
            document.documentElement.classList.remove('cgpt-theme-transitioning');
          }, 600);

          chrome.storage.sync.set({ appearance: settingValue });
          appearanceToggle.setAttribute('data-switch-state', switchState);
        });
      });
    }
  }

  function applyRootFlags() {
    document.documentElement.classList.toggle(HTML_CLASS, true);
    document.documentElement.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    document.documentElement.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
    document.documentElement.classList.toggle(CLEAR_APPEARANCE_CLASS, settings.appearance === 'clear');
    document.documentElement.classList.toggle('cgpt-cute-voice-on', !!settings.cuteVoiceUI);
    document.documentElement.classList.toggle('cgpt-focus-mode-on', !!settings.focusMode);
  document.documentElement.classList.toggle('cgpt-cinema-mode', !!settings.cinemaMode);

    // NEW: Custom Font Support
    const customFont = settings.customFont || 'system';
    document.documentElement.setAttribute('data-custom-font', customFont);

    // NEW: Streamer Mode (Blur)
    document.documentElement.classList.toggle('cgpt-blur-chat-history', !!settings.blurChatHistory);
    document.documentElement.classList.toggle('cgpt-blur-avatar', !!settings.blurAvatar);

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
    try { legacyTrigger.dispatchEvent(new PointerEvent('pointerover', pointerInit)); } catch (e) { }
    try { legacyTrigger.dispatchEvent(new PointerEvent('pointerenter', pointerInit)); } catch (e) { }
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

  // NEW: Selectors for the Unified Glass Engine
  const GLASS_SELECTORS = [
    /* Popups, Menus, Dialogs */
    '.popover.bg-token-main-surface-primary[data-radix-menu-content]',
    '.popover.bg-token-main-surface-primary[role="dialog"]',
    'div[role="dialog"][class*="shadow-long"]',
    '.popover.bg-token-main-surface-primary.max-w-xs',
    'div.sticky.top-14.bg-token-main-surface-primary',
    'div[role="dialog"]:has(input#search[placeholder="Search GPTs"])',
    'textarea.bg-token-main-surface-primary.border-token-border-default',
    '.bg-token-main-surface-primary.sticky.top-\\[-1px\\]',
    /* Composer & Code Blocks */
    'form[data-type="unified-composer"] > div > div',
    'div[data-message-author-role="assistant"] pre',
    '.agent-turn pre',
    /* Buttons & UI Elements */
    '#cgpt-qs-panel',
    'div.bg-token-bg-primary.w-full.block:has(ul.divide-y)',
    '.py-3.px-3.rounded-3xl.bg-token-main-surface-tertiary',
    '.divide-token-border-default.bg-token-main-surface-primary.mx-1.mt-1',
    'button[aria-label="Scroll down"]',
    '.active\\:opacity-1.border-none.rounded-xl.flex.shadow-long.btn-secondary.relative.btn',
    '.shrink-0.btn-secondary.relative.btn',
    '.shrink-0.btn-danger-outline.relative.btn',
    '.justify-between.items-center.flex > .btn-small.btn-secondary.relative.btn',
    '.hover\\:cursor-pointer.cursor-default.me-0.my-0.btn-small.btn.btn-secondary',
    '.p-4.rounded-lg.justify-stretch.items-center.flex-col.w-full.flex.relative.bg-token-main-surface-primary',
    '.p-4.rounded-xl.my-4.bg-token-bg-tertiary.text-token-text-secondary',
    '.p-3.border.rounded-\\[10px\\].w-full.btn-secondary',
    '[role="tooltip"]',
    /* Toast Notifications */
    '[role="alert"]',
    '[role="status"]',
    /* Scroll to bottom button */
    '.absolute.z-30.h-8.w-8.rounded-full.bg-token-main-surface-primary',
    /* Voice Mode Buttons (Icon & Expanded Pill) */
    'button.h-9.w-9.rounded-full.bg-black',
    '.h-9.rounded-full.bg-token-bg-accent-static'
  ];

  // A single, combined selector that efficiently finds only untagged elements.
  const UNTAGGED_GLASS_SELECTOR = GLASS_SELECTORS.map(s => `${s}:not([data-aurora-glass="true"])`).join(',');

  /**
   * Applies a data-attribute to elements that should have a glass effect.
   * This is more robust and maintainable than a massive CSS :is() selector.
   * It only queries for and processes elements that have not already been tagged.
   * @param {Document|Element} root - The root element to search within.
   */
  function applyGlassEffects(root = document) {
    // If root itself matches, tag it (rare but possible for dynamic inserts)
    if (root.nodeType === 1 && root.matches && root.matches(UNTAGGED_GLASS_SELECTOR)) {
        root.dataset.auroraGlass = 'true';
    }

    // Find children
    const elements = root.querySelectorAll(UNTAGGED_GLASS_SELECTOR);
    for (const el of elements) {
      el.dataset.auroraGlass = 'true';
    }
  }

  // --- New Feature Implementations ---

  // 1. Audio Engine (Synthesized Haptics)
  const AudioEngine = {
    ctx: null,
    isListening: false,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
    },
    play(type) {
      if (!settings.soundEnabled || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const vol = settings.soundVolume === 'high' ? 0.1 : (settings.soundVolume === 'medium' ? 0.05 : 0.02);

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
    },
    attachListeners() {
      if (!settings.soundEnabled || this.isListening) return;
      this.isListening = true;
      document.body.addEventListener('mouseenter', (e) => {
        if (e.target.matches && e.target.matches('button, a, [role="button"], input, .btn')) {
          this.play('hover');
        }
      }, true); // Capture phase to catch all
      document.body.addEventListener('click', (e) => {
        this.play('click');
      }, true);
    }
  };

  // 2. Smart DOM Healer
  const SmartDOM = {
    cache: {},
    definitions: {
      'composer': {
        selector: '#prompt-textarea',
        heuristic: () => document.querySelector('textarea[placeholder*="Message"]') || document.querySelector('textarea[data-id]')
      },
      'sidebar': {
        selector: '#stage-slideover-sidebar', // Using ID we expect, but might change
        heuristic: () => document.querySelector('nav') ? document.querySelector('nav').closest('div[class*="bg-token-sidebar"]') : null
      }
    },
    get(key) {
      if (!settings.smartSelectors) return document.querySelector(this.definitions[key]?.selector);

      if (this.cache[key] && document.body.contains(this.cache[key])) {
        return this.cache[key];
      }

      const def = this.definitions[key];
      if (!def) return null;

      let el = document.querySelector(def.selector);
      if (!el && def.heuristic) {
        el = def.heuristic();
        // Healed selector silently
      }

      if (el) this.cache[key] = el;
      return el;
    }
  };

  // 3. Contrast Engine
  const ContrastEngine = {
    canvas: null,
    ctx: null,
    init() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 50;
            this.canvas.height = 50;
            // WillReadFrequently optimization hint
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
    },
    analyze(imgElement) {
      if (!settings.autoContrast) return;
      this.init(); // Constant check, cheap
      
      try {
        // Handle cross-origin if possible (won't work for all external URLs)
        if (imgElement.src.startsWith('http') && !imgElement.src.includes(location.host)) {
          imgElement.crossOrigin = "Anonymous";
        }

        this.ctx.drawImage(imgElement, 0, 0, 50, 50);
        const data = this.ctx.getImageData(0, 0, 50, 50).data;
        let r, g, b, avg;
        let colorSum = 0;

        for (let x = 0, len = data.length; x < len; x += 4) {
          r = data[x];
          g = data[x + 1];
          b = data[x + 2];
          avg = Math.floor((r + g + b) / 3);
          colorSum += avg;
        }

        const brightness = Math.floor(colorSum / (50 * 50));
        // Simple logic: Bright image -> Darker overlay. Dark image -> Lighter overlay.
        // Base opacity is around 0.58.
        let newOpacity = 0.58;
        if (brightness > 200) newOpacity = 0.85; // Very bright bg, darken overlay
        else if (brightness > 128) newOpacity = 0.70;
        else if (brightness < 50) newOpacity = 0.40;
        document.documentElement.style.setProperty('--bg-opacity', newOpacity);
      } catch (e) {
        // CORS error likely, fail silently and use default
        document.documentElement.style.removeProperty('--bg-opacity');
      }
    }
  };

  // 4. Snapshot Engine (Visual "Presentation Mode" + Capture)
  const SnapshotEngine = {
    isActive: false,
    toggleMode() {
      this.isActive = !this.isActive;
      document.documentElement.classList.toggle('cgpt-snapshot-mode', this.isActive);

      const btn = document.getElementById('qs-snapshot-btn');
      if (btn) {
        btn.classList.toggle('active', this.isActive);
        btn.title = this.isActive ? "Exit Snapshot Mode" : "Enter Snapshot Mode";
      }
    },
    // Simple DOM-to-Image attempt (Canvas ForeignObject)
    async capture() {
      // Simple implementation: Just let the user screenshot in "Snapshot Mode".
      // A full programmatic screenshot is unstable with external assets.
      // We will just provide the "Zen Mode" view.
      if (!this.isActive) this.toggleMode();

      // Show a temporary toast
      const toast = document.createElement('div');
      toast.textContent = "Snapshot Mode Active. Use your screen capture tool now.";
      Object.assign(toast.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 24px',
        borderRadius: '8px', zIndex: '999999', pointerEvents: 'none',
        fontFamily: 'system-ui', fontSize: '14px', backdropFilter: 'blur(8px)'
      });
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  };

  // --- Holiday Effects Engine (GPU-Optimized) ---
  function manageHolidayEffects() {
    if (SANTA_HAT_URL) {
      document.documentElement.style.setProperty('--aurora-santa-hat-image', `url("${SANTA_HAT_URL}")`);
    }
    // Set snowdrift images
    if (SNOWDRIFT_LEFT_URL) {
      document.documentElement.style.setProperty('--aurora-snowdrift-left-image', `url("${SNOWDRIFT_LEFT_URL}")`);
    }
    if (SNOWDRIFT_RIGHT_URL) {
      document.documentElement.style.setProperty('--aurora-snowdrift-right-image', `url("${SNOWDRIFT_RIGHT_URL}")`);
    }
    // Set ChatGPT logo for snow
    if (CHATGPT_LOGO_URL) {
      document.documentElement.style.setProperty('--aurora-snow-image', `url("${CHATGPT_LOGO_URL}")`);
    }
    document.documentElement.classList.toggle('cgpt-snow-on', !!settings.enableSnowfall);
    // Toggle snow logo class based on snowType
    document.documentElement.classList.toggle('cgpt-snow-logo', settings.snowType === 'chatgpt-logo' && settings.enableSnowfall);

    // 1. Snowfall Logic (Optimized: fewer elements, CSS-driven properties)
    let snowContainer = document.getElementById('aurora-snow-container');
    
    if (settings.enableSnowfall) {
      if (!snowContainer) {
        snowContainer = document.createElement('div');
        snowContainer.id = 'aurora-snow-container';
        snowContainer.className = 'aurora-snow-container';
        
        // Use template for faster cloning (40 snowflakes - reduced from 60)
        const template = document.createElement('div');
        template.className = 'aurora-snowflake';
        
        const frag = document.createDocumentFragment();
        
        // Pre-generate all random values for consistency
        for (let i = 0; i < 40; i++) {
          const f = template.cloneNode(true);
          
          // Use CSS custom properties for GPU-optimized values
          const left = Math.random() * 100;
          const duration = Math.random() * 6 + 6; // 6-12s (slower = less CPU)
          const delay = Math.random() * 8;
          const opacity = Math.random() * 0.5 + 0.4; // 0.4-0.9
          const size = Math.random() * 3 + 2; // 2-5px
          
          // Batch style assignments via cssText for fewer reflows
          f.style.cssText = `
            left: ${left}vw;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            opacity: ${opacity};
            width: ${size}px;
            height: ${size}px;
          `;
          
          frag.appendChild(f);
        }
        
        snowContainer.appendChild(frag);
        document.body.appendChild(snowContainer);
      }
      // Ensure it's visible if it was exiting
      snowContainer.classList.remove('exiting');
      
    } else if (snowContainer && !snowContainer.classList.contains('exiting')) {
      // Fade out animation
      snowContainer.classList.add('exiting');
      setTimeout(() => {
        // Check again if setting is still disabled
        const container = document.getElementById('aurora-snow-container');
        if (!settings.enableSnowfall && container) {
          container.remove();
        }
      }, 800);
    }

    // 2. New Year Garland Logic (Optimized: fixed count, pre-defined colors)
    let garlandContainer = document.getElementById('aurora-garland-container');
    
    if (settings.enableNewYear) {
      if (!garlandContainer) {
        garlandContainer = document.createElement('div');
        garlandContainer.id = 'aurora-garland-container';
        garlandContainer.className = 'aurora-garland-container';
        
        // Fixed count of 30 bulbs (good balance for most screens)
        const BULB_COUNT = 30;
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
        
        // Use template for faster cloning
        const wireTemplate = document.createElement('div');
        wireTemplate.className = 'aurora-garland-wire-segment';
        const bulbTemplate = document.createElement('div');
        bulbTemplate.className = 'aurora-bulb';
        
        const frag = document.createDocumentFragment();
        
        for (let i = 0; i < BULB_COUNT; i++) {
          const s = wireTemplate.cloneNode(true);
          const b = bulbTemplate.cloneNode(true);
          
          // Pre-compute color index for deterministic pattern
          b.style.setProperty('--bulb-color', colors[i % colors.length]);
          b.style.animationDelay = (i * 0.15) + 's'; // Staggered timing
          
          s.appendChild(b);
          frag.appendChild(s);
        }
        
        garlandContainer.appendChild(frag);
        document.body.appendChild(garlandContainer);
      }
    } else if (garlandContainer) {
      garlandContainer.remove();
    }
  }

  function applyAllSettings() {
    showBg();

    if (!settings.hideQuickSettings) {
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
    applyGlassEffects();
    maybeApplyDefaultModel();

    // Manage token counter
    if (window.AuroraTokenCounter) {
      window.AuroraTokenCounter.manage(!!settings.showTokenCounter);
    }

    // Initialize Audio Engine listeners if enabled
    if (settings.soundEnabled) {
      AudioEngine.init();
    }

    // Manage Contrast Engine based on flag
    if (settings.autoContrast) {
      const bgNode = document.getElementById(ID);
      if (bgNode) {
        const activeImg = bgNode.querySelector('.media-layer.active img');
        if (activeImg && activeImg.complete) ContrastEngine.analyze(activeImg);
      }
    } else {
      document.documentElement.style.removeProperty('--bg-opacity');
    }

    // Manage Data Masking Engine
    if (window.DataMaskingEngine) {
      window.DataMaskingEngine.init().then(() => {
        if (window.DataMaskingEngine.isEnabled()) {
          window.DataMaskingEngine.maskElement(document.body);
        }
      });
    }

    manageHolidayEffects();
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
        // We rely on refreshSettingsAndApply to call applyAllSettings, which handles initial setup
        obs.disconnect();
      }
    });

    uiReadyObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('focus', applyAllSettings, { passive: true });
    let lastUrl = location.href;
    // Debounce navigation checks to prevent trashing on rapid state changes
    const checkUrl = debounce(() => { 
        if (location.href === lastUrl) return; 
        lastUrl = location.href; 
        applyAllSettings(); 
    }, 50);
    window.addEventListener('popstate', checkUrl, { passive: true });
    const originalPushState = history.pushState;
    history.pushState = function (...args) { originalPushState.apply(this, args); setTimeout(checkUrl, 0); };
    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) { originalReplaceState.apply(this, args); setTimeout(checkUrl, 0); };

    // For performance, debounce less-critical UI checks that don't cause flicker.
    const debouncedOtherChecks = debounce(() => {
      manageGpt5LimitPopup();
      maybeApplyDefaultModel();
      manageUpgradeButtons(); // Moved here to be debounced
    }, 150);

    // Optimization: Use Idle Callback for full document scans
    const runGlassEffectsFull = () => {
        safeRequestIdleCallback(() => applyGlassEffects(document), { timeout: 1000 });
    };
    const debouncedGlassEffects = debounce(runGlassEffectsFull, 200);

    let renderFrameId = null;
    const domObserver = new MutationObserver((mutations) => {
      if (document.hidden) return;
      if (renderFrameId) return;

      // Check if a menu, dialog, or popover was just opened
      let urgentUiUpdate = false;
      let newNodesToProcess = [];

      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) { // Element node
            newNodesToProcess.push(n);
            // Check for popovers, dialogs, or menus
            if (n.classList.contains('popover') || 
                n.getAttribute('role') === 'dialog' || 
                n.getAttribute('role') === 'menu' ||
                n.querySelector?.('.popover, [role="dialog"], [role="menu"]')) {
              urgentUiUpdate = true;
            }
          }
        }
      }

      renderFrameId = requestAnimationFrame(() => {
        // 1. Critical Hiding - moved to debounce unless urgent
        if (urgentUiUpdate) manageUpgradeButtons();

        // 2. Glass Effects - Optimized
        if (urgentUiUpdate) {
            // Instant apply ONLY to new nodes for performance
            newNodesToProcess.forEach(node => applyGlassEffects(node));
        } else {
            // Regular debounced full scan for lower priority updates
            debouncedGlassEffects(); 
        }

        // 3. Data Masking
        if (window.DataMaskingEngine && window.DataMaskingEngine.isEnabled()) {
            newNodesToProcess.forEach(node => window.DataMaskingEngine.maskElement(node));
        }

        renderFrameId = null;
      });

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
                    <img src="${chrome.runtime.getURL('icons/logo-48.png')}" alt="Aurora" class="aurora-logo-img">
                    <h1>${getMessage('welcomeTitle')}</h1>
                    <p>${getMessage('welcomeDescription')}</p>
                    <!-- Progress Indicator -->
                    <div class="progress-dots">
                        <span class="dot active"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                    <button id="get-started-btn" class="welcome-btn primary">${getMessage('welcomeBtnGetStarted')}</button>
                </div>
            </div>
        </div>

        <!-- Bar 1: Style Setup -->
        <div id="aurora-style-bar" class="aurora-setup-bar">
            <!-- Holiday Mode Section -->
            <div class="setup-section holiday-section">
                <div class="holiday-mode-toggle">
                    <span class="holiday-emoji">🎄</span>
                    <span class="holiday-label">${getMessage('labelHolidayMode')}</span>
                    <label class="switch">
                        <input type="checkbox" id="welcome-holiday-mode">
                        <span class="track"><span class="thumb"></span></span>
                    </label>
                </div>
            </div>

            <div class="setup-divider"></div>

            <!-- Background Presets -->
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
                    <button class="preset-tile christmas-tile" data-bg-url="christmas">
                        <div class="preview christmas"></div>
                        <span>🎄 Christmas</span>
                    </button>
                    <button class="preset-tile" data-bg-url="grokHorizon">
                        <div class="preview grok"></div>
                        <span>${getMessage('welcomePresetHorizon')}</span>
                    </button>
                </div>
            </div>

            <!-- Glass Style -->
            <div class="setup-section">
                <label class="section-label">${getMessage('welcomeLabelGlassStyle')}</label>
                <div class="aurora-glass-switch" id="welcome-glass-switch" data-switch-state="0">
                    <div class="aurora-switch-glider"></div>
                    <button type="button" class="aurora-switch-btn" data-value="0" data-appearance="clear">${getMessage('welcomeGlassClear')}</button>
                    <button type="button" class="aurora-switch-btn" data-value="1" data-appearance="dimmed">${getMessage('welcomeGlassDimmed')}</button>
                </div>
            </div>

            <!-- Progress Indicator Step 2 -->
            <div class="progress-dots bar-dots">
                <span class="dot"></span>
                <span class="dot active"></span>
                <span class="dot"></span>
            </div>

            <button id="next-to-support-btn" class="welcome-btn primary finish-button">${getMessage('welcomeBtnNext')}</button>
        </div>

        <!-- Screen 3: Support Project -->
        <div id="aurora-support-screen" class="support-screen">
            <div class="support-card">
                <div class="support-header">
                    <span class="support-icon">💖</span>
                    <h2>${getMessage('welcomeSupportTitle')}</h2>
                </div>
                <p class="support-description">${getMessage('welcomeSupportDescription')}</p>
                
                <div class="support-buttons">
                    <a href="https://ko-fi.com/testtm" target="_blank" rel="noopener" class="support-btn donate-btn">
                        <span class="btn-icon">☕</span>
                        <span>${getMessage('welcomeSupportDonate')}</span>
                    </a>
                    <a href="https://github.com/AuroraForChatGPT/Aurora-for-ChatGPT" target="_blank" rel="noopener" class="support-btn github-btn">
                        <span class="btn-icon">⭐</span>
                        <span>${getMessage('welcomeSupportStar')}</span>
                    </a>
                </div>

                <div class="progress-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot active"></span>
                </div>

                <button id="finish-btn" class="welcome-btn primary">${getMessage('welcomeBtnFinish')}</button>
                <button id="skip-support-btn" class="welcome-btn-link">${getMessage('welcomeBtnSkip')}</button>
            </div>
        </div>

        <!-- Success Overlay -->
        <div id="aurora-success-overlay" class="success-overlay">
            <div class="success-checkmark">
                <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none"/>
                    <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            </div>
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
    const nextToSupportBtn = document.getElementById('next-to-support-btn');
    const finishBtn = document.getElementById('finish-btn');
    const skipSupportBtn = document.getElementById('skip-support-btn');
    const welcomeOverlay = document.getElementById('aurora-welcome-overlay');
    const welcomeContainer = document.querySelector('.welcome-container');
    const styleBar = document.getElementById('aurora-style-bar');
    const supportScreen = document.getElementById('aurora-support-screen');

    let tempSettings = { ...settings }; // Clone settings for preview

    const finishWelcome = () => {
      tempSettings.hasSeenWelcomeScreen = true;
      chrome.storage.sync.set(tempSettings, () => {
        if (chrome.runtime.lastError) {
          console.error("Aurora Extension Error (Welcome Finish):", chrome.runtime.lastError.message);
          return;
        }
        // Show success animation
        const successOverlay = document.getElementById('aurora-success-overlay');
        if (successOverlay) {
          successOverlay.classList.add('active');
          setTimeout(() => {
            if (welcomeOverlay) welcomeOverlay.remove();
            // Add sparkle hint to Quick Settings button for new users
            setTimeout(() => {
              const qsBtn = document.getElementById(QS_BUTTON_ID);
              if (qsBtn) {
                qsBtn.classList.add('sparkle-hint');
                // Remove sparkle when clicked
                qsBtn.addEventListener('click', () => {
                  qsBtn.classList.remove('sparkle-hint');
                }, { once: true });
              }
            }, 500);
          }, 1200);
        } else {
          if (welcomeOverlay) welcomeOverlay.remove();
        }
      });
    };

    // --- Event Listeners ---
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
        if (welcomeOverlay) {
          welcomeOverlay.classList.add('setup-active');
        }

        if (welcomeContainer) {
          welcomeContainer.classList.add('exiting');
          setTimeout(() => {
            if (styleBar) styleBar.classList.add('active');
          }, 150);
          setTimeout(() => {
            welcomeContainer.style.display = 'none';
          }, 500);
        } else {
          if (styleBar) styleBar.classList.add('active');
        }

        // Initialize with defaults visually
        const defaultTile = document.querySelector('#aurora-style-bar .preset-tile[data-bg-url="default"]');
        if (defaultTile) defaultTile.classList.add('active');
        // Glass switch defaults to state="0" (Clear) which is already set in HTML
      });
    }

    // Step 2 → Step 3 (Style Bar → Support Screen)
    if (nextToSupportBtn) {
      nextToSupportBtn.addEventListener('click', () => {
        if (styleBar) {
          styleBar.classList.remove('active');
          styleBar.classList.add('exiting');
        }
        setTimeout(() => {
          if (supportScreen) supportScreen.classList.add('active');
        }, 200);
      });
    }

    // Skip support → finish immediately
    if (skipSupportBtn) {
      skipSupportBtn.addEventListener('click', finishWelcome);
    }

    // Finish button → save and show success
    if (finishBtn) {
      finishBtn.addEventListener('click', finishWelcome);
    }

    document.querySelectorAll('#aurora-style-bar .preset-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        document.querySelectorAll('#aurora-style-bar .preset-tile').forEach(t => t.classList.remove('active'));
        tile.classList.add('active');
        const bgChoice = tile.dataset.bgUrl;
        let newUrl = '';
        if (bgChoice === 'blue') newUrl = BLUE_WALLPAPER_URL;
        else if (bgChoice === 'grokHorizon') newUrl = GROK_HORIZON_URL;
        else if (bgChoice === 'christmas') newUrl = CHRISTMAS_BG_URL;
        else if (bgChoice === '__gpt5_animated__') newUrl = '__gpt5_animated__';

        tempSettings.customBgUrl = newUrl;
        settings.customBgUrl = newUrl;
        applyAllSettings();

        // If Christmas preset selected, auto-check Holiday Mode toggle
        const holidayToggle = document.getElementById('welcome-holiday-mode');
        if (holidayToggle && bgChoice === 'christmas') {
          holidayToggle.checked = true;
          tempSettings.enableSnowfall = true;
          tempSettings.enableNewYear = true;
          settings.enableSnowfall = true;
          settings.enableNewYear = true;
          applyAllSettings();
        }
      });
    });

    // Holiday Mode toggle handler
    const welcomeHolidayMode = document.getElementById('welcome-holiday-mode');
    if (welcomeHolidayMode) {
      welcomeHolidayMode.addEventListener('change', () => {
        const isOn = welcomeHolidayMode.checked;
        tempSettings.enableSnowfall = isOn;
        tempSettings.enableNewYear = isOn;
        settings.enableSnowfall = isOn;
        settings.enableNewYear = isOn;
        
        if (isOn) {
          tempSettings.customBgUrl = CHRISTMAS_BG_URL;
          settings.customBgUrl = CHRISTMAS_BG_URL;
          document.querySelectorAll('#aurora-style-bar .preset-tile').forEach(t => t.classList.remove('active'));
          const christmasTile = document.querySelector('#aurora-style-bar .preset-tile[data-bg-url="christmas"]');
          if (christmasTile) christmasTile.classList.add('active');
        }
        applyAllSettings();
      });
    }

    // Glass Style animated switch handler
    const glassSwitch = document.getElementById('welcome-glass-switch');
    if (glassSwitch) {
      glassSwitch.querySelectorAll('.aurora-switch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const value = btn.dataset.value;
          const appearanceChoice = btn.dataset.appearance;
          glassSwitch.setAttribute('data-switch-state', value);
          tempSettings.appearance = appearanceChoice;
          settings.appearance = appearanceChoice;
          applyAllSettings();
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
        
        // --- INSTANT UPDATES: Apply all changes immediately ---
        // Update settings object with new values first
        changedKeys.forEach(key => {
          if (changes[key]) {
            settings[key] = changes[key].newValue;
          }
        });

        // Holiday Effects (instant)
        if (changes.enableSnowfall || changes.enableNewYear) {
          manageHolidayEffects();
        }

        // Root flags (CSS classes on <html>) - includes appearance, cinemaMode
        const rootFlagKeys = ['legacyComposer', 'disableAnimations', 'focusMode', 'cuteVoiceUI', 
                              'blurChatHistory', 'blurAvatar', 'theme', 'customFont', 'voiceColor',
                              'appearance', 'cinemaMode'];
        if (changedKeys.some(k => rootFlagKeys.includes(k))) {
          applyRootFlags();
        }

        // Background changes (instant via BackgroundManager)
        if (changes.customBgUrl || changes.backgroundBlur || changes.backgroundScaling) {
          updateBackgroundImage();
          applyCustomStyles();
        }

        // UI managers (lightweight, run instantly)
        if (changes.hideGpt5Limit) manageGpt5LimitPopup();
        if (changes.hideUpgradeButtons) manageUpgradeButtons();
        if (changes.hideQuickSettings !== undefined) {
          if (!settings.hideQuickSettings) manageQuickSettingsUI();
        }
        if (changes.defaultModel) maybeApplyDefaultModel();
        if (changes.showTokenCounter && window.AuroraTokenCounter) {
          window.AuroraTokenCounter.manage(!!settings.showTokenCounter);
        }
        if (changes.soundEnabled && settings.soundEnabled) {
          AudioEngine.attachListeners();
        }

      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        // Local background data changed - trigger background update
        updateBackgroundImage();
      }
    });
  }

})();