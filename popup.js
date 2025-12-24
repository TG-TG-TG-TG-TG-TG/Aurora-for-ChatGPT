// popup.js - Zero-Latency Optimized (Instant Open)
// Performance-first rewrite: cached settings, element caching, single-pass init

// --- Constants & Defaults ---
const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const GROK_HORIZON_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Aurora/grok-4.webp') : 'Aurora/grok-4.webp';
const CHRISTMAS_BG_URL = chrome?.runtime?.getURL ? chrome.runtime.getURL('Aurora/christmas-bg.webp') : 'Aurora/christmas-bg.webp';
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const FEEDBACK_API_URL = 'https://auroraforchatgpt.tnemoroccan.workers.dev';

const DEFAULTS = {
  legacyComposer: false, theme: 'auto', appearance: 'clear', hideGpt5Limit: false,
  hideUpgradeButtons: false, disableAnimations: false, focusMode: false,
  hideQuickSettings: false, customBgUrl: '', backgroundBlur: '60',
  backgroundScaling: 'cover', voiceColor: 'default', cuteVoiceUI: false,
  hasSeenWelcomeScreen: false, defaultModel: '', customFont: 'system',
  showTokenCounter: false, blurChatHistory: false, blurAvatar: false,
  soundEnabled: false, soundVolume: 'low', autoContrast: false,
  smartSelectors: true, dataMaskingEnabled: false, maskingRandomMode: false,
  enableSnowfall: false, enableNewYear: false, cinemaMode: false, snowType: 'standard'
};

const TOGGLE_KEYS = [
  'legacyComposer', 'hideGpt5Limit', 'hideUpgradeButtons', 'disableAnimations',
  'focusMode', 'hideQuickSettings', 'showTokenCounter', 'blurChatHistory',
  'blurAvatar', 'soundEnabled', 'autoContrast', 'dataMaskingEnabled',
  'maskingRandomMode', 'enableSnowfall', 'enableNewYear', 'cuteVoiceUI', 'cinemaMode'
];

// --- Element Cache (populated once on DOMContentLoaded) ---
const $ = {};
let selectsInitialized = false;
let listenersAttached = false;

// --- Helpers ---
const getMessage = (key) => chrome?.i18n?.getMessage(key) || key;

// --- Main Initialization (Zero-Latency) ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Cache all DOM elements ONCE (eliminates repeated querySelectorAll)
  cacheElements();

  // 2. Apply localization immediately (uses cached elements)
  applyLocalization();

  // 3. Setup static UI (tabs, feedback) - no data needed
  setupTabs();
  setupFeedbackSystem();

  // 4. Render with defaults INSTANTLY (0ms blocking - UI appears immediately)
  renderUi(DEFAULTS, { detectedTheme: 'dark' });

  // 5. Hydrate with real data via INSTANT message (cached in background.js)
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS_FULL' }, (response) => {
    if (chrome.runtime.lastError) {
      // Fallback: direct storage access if message fails
      Promise.all([
        chrome.storage.sync.get(DEFAULTS),
        chrome.storage.local.get(['customBgData', 'detectedTheme'])
      ]).then(([sync, local]) => {
        hydrateWithRealData({ ...DEFAULTS, ...sync }, local);
      });
      return;
    }

    const { settings, local } = response || {};
    hydrateWithRealData(settings || DEFAULTS, local || {});
  });
});

function hydrateWithRealData(settings, localData) {
  // Re-render with actual user data
  renderUi(settings, localData);

  // Attach event listeners ONCE (after real data is loaded)
  if (!listenersAttached) {
    setupChangeListeners();
    setupImportExport();
    listenersAttached = true;
  }

  // Build search index in idle time (low priority, non-blocking)
  if (window.requestIdleCallback) {
    requestIdleCallback(buildSearchableData, { timeout: 2000 });
  } else {
    setTimeout(buildSearchableData, 300);
  }
}

// --- Element Caching (Run once, eliminates all getElementById calls) ---
function cacheElements() {
  // Toggle elements
  TOGGLE_KEYS.forEach(key => { $.toggles = $.toggles || {}; $.toggles[key] = document.getElementById(key); });

  // Individual elements
  $.blurSlider = document.getElementById('blurSlider');
  $.blurValue = document.getElementById('blurValue');
  $.bgUrl = document.getElementById('bgUrl');
  $.bgFile = document.getElementById('bgFile');
  $.clearBg = document.getElementById('clearBg');
  $.modelRow = document.getElementById('defaultModelCustomRow');
  $.modelInput = document.getElementById('defaultModelCustomInput');
  $.settingsSearch = document.getElementById('settingsSearch');
  $.clearSearchBtn = document.getElementById('clearSearchBtn');
  $.exportSettings = document.getElementById('exportSettings');
  $.importSettings = document.getElementById('importSettings');
  $.settingsJson = document.getElementById('settingsJson');
  $.importExportRow = document.getElementById('importExportTextAreaRow');
  $.holidayMode = document.getElementById('holidayMode');

  // Feedback elements
  $.feedbackTrigger = document.getElementById('feedbackTrigger');
  $.feedbackBox = document.getElementById('feedbackBox');
  $.closeFeedback = document.getElementById('closeFeedback');
  $.sendFeedback = document.getElementById('sendFeedback');
  $.feedbackInput = document.getElementById('feedbackInput');
  $.feedbackStatus = document.getElementById('feedbackStatus');
  $.donationModal = document.getElementById('donationModal');
  $.closeDonationModal = document.getElementById('closeDonationModal');
  $.ticketIdDisplay = document.getElementById('ticketIdDisplay');
  $.copyTicketBtn = document.getElementById('copyTicketBtn');
  $.copyFeedback = document.getElementById('copyFeedback');

  // Collections (cached once)
  $.tabs = document.querySelectorAll('.tab-link');
  $.panes = document.querySelectorAll('.tab-pane');
  $.tabNav = document.querySelector('.tab-nav');
  $.i18nElements = document.querySelectorAll('[data-i18n]');
  $.i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
  $.i18nTitles = document.querySelectorAll('[data-i18n-title]');
  $.rows = document.querySelectorAll('.row');

  // Custom selects (containers)
  $.selects = {
    bgPreset: document.getElementById('bgPreset'),
    bgScalingSelector: document.getElementById('bgScalingSelector'),
    themeSelector: document.getElementById('themeSelector'),
    appearanceSelector: document.getElementById('appearanceSelector'),
    fontSelector: document.getElementById('fontSelector'),
    voiceColorSelector: document.getElementById('voiceColorSelector'),
    defaultModelSelector: document.getElementById('defaultModelSelector'),
    snowTypeSelector: document.getElementById('snowTypeSelector')
  };
}

// --- Core Rendering Logic (Optimized) ---
function renderUi(settings, localData = {}) {
  // Theme Toggle
  let isLightTheme = settings.theme === 'light';
  if (settings.theme === 'auto' && localData.detectedTheme === 'light') {
    isLightTheme = true;
  }
  document.documentElement.classList.toggle('theme-light', isLightTheme);

  // Boolean Toggles (uses cached elements)
  TOGGLE_KEYS.forEach(key => {
    const el = $.toggles?.[key];
    if (el) el.checked = !!settings[key];
  });

  // Holiday Mode toggle state (on if all holiday features are enabled)
  if ($.holidayMode) {
    const isHolidayMode = settings.enableSnowfall && settings.enableNewYear &&
      settings.customBgUrl === CHRISTMAS_BG_URL;
    $.holidayMode.checked = isHolidayMode;
  }

  // Range Sliders
  if ($.blurSlider && $.blurValue) {
    $.blurSlider.value = settings.backgroundBlur;
    $.blurValue.textContent = settings.backgroundBlur;
  }

  // Text Inputs
  if ($.bgUrl) {
    if (settings.customBgUrl === '__gpt5_animated__') {
      $.bgUrl.value = getMessage('statusAnimatedBackground') || 'Animated Active';
      $.bgUrl.disabled = true;
    } else if (settings.customBgUrl === '__local__') {
      $.bgUrl.value = getMessage('statusLocalFileInUse') || 'Local File Active';
      $.bgUrl.disabled = true;
    } else if (document.activeElement !== $.bgUrl) {
      const presets = [BLUE_WALLPAPER_URL, GROK_HORIZON_URL, CHRISTMAS_BG_URL];
      $.bgUrl.value = presets.includes(settings.customBgUrl) ? '' : settings.customBgUrl;
      $.bgUrl.disabled = false;
    }
  }

  // Custom Model Input
  const knownModels = ['gpt-5', 'gpt-5-thinking', 'gpt-5-thinking-mini', 'gpt-5-thinking-instant', 'gpt-4o', 'gpt-4.1', 'o3', 'o4-mini', ''];
  const isCustomModel = settings.defaultModel && !knownModels.includes(settings.defaultModel);

  if ($.modelRow) $.modelRow.hidden = !isCustomModel;
  if ($.modelInput && isCustomModel) $.modelInput.value = settings.defaultModel;

  // Initialize/Update Custom Selects (Optimized: builds once, updates only values)
  initOrUpdateSelects(settings);
}

// --- Custom Selects (Single-Pass Initialization) ---
const SELECT_CONFIGS = [
  {
    id: 'bgPreset', key: 'customBgUrl',
    options: [
      { value: 'default', labelKey: 'bgPresetOptionDefault' },
      { value: '__gpt5_animated__', labelKey: 'bgPresetOptionGpt5Animated' },
      { value: 'grokHorizon', labelKey: 'bgPresetOptionGrokHorizon' },
      { value: 'christmas', labelKey: 'bgPresetOptionChristmas' },
      { value: 'blue', labelKey: 'bgPresetOptionBlue' },
      { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
    ],
    mapVal: (v) => {
      if (!v) return 'default';
      if (v === BLUE_WALLPAPER_URL) return 'blue';
      if (v === GROK_HORIZON_URL) return 'grokHorizon';
      if (v === CHRISTMAS_BG_URL) return 'christmas';
      if (v === '__gpt5_animated__') return '__gpt5_animated__';
      return 'custom';
    },
    onSelect: (val) => {
      let url = '';
      if (val === 'blue') url = BLUE_WALLPAPER_URL;
      else if (val === 'grokHorizon') url = GROK_HORIZON_URL;
      else if (val === 'christmas') url = CHRISTMAS_BG_URL;
      else if (val === '__gpt5_animated__') url = '__gpt5_animated__';
      if (val !== 'custom') chrome.storage.local.remove(LOCAL_BG_KEY);
      chrome.storage.sync.set({ customBgUrl: url });
    }
  },
  {
    id: 'bgScalingSelector', key: 'backgroundScaling',
    options: [
      { value: 'contain', labelKey: 'bgScalingOptionContain' },
      { value: 'cover', labelKey: 'bgScalingOptionCover' }
    ]
  },
  {
    id: 'themeSelector', key: 'theme',
    options: [
      { value: 'auto', labelKey: 'themeOptionAuto' },
      { value: 'light', labelKey: 'themeOptionLight' },
      { value: 'dark', labelKey: 'themeOptionDark' }
    ]
  },
  {
    id: 'appearanceSelector', key: 'appearance',
    options: [
      { value: 'clear', labelKey: 'glassAppearanceOptionClear' },
      { value: 'dimmed', labelKey: 'glassAppearanceOptionDimmed' }
    ]
  },
  {
    id: 'fontSelector', key: 'customFont',
    options: [
      { value: 'system', labelKey: 'fontOptionSystem' },
      { value: 'inter', labelKey: 'fontOptionInter' },
      { value: 'roboto', labelKey: 'fontOptionRoboto' },
      { value: 'montserrat', labelKey: 'fontOptionMontserrat' },
      { value: 'opensans', labelKey: 'fontOptionOpenSans' },
      { value: 'poppins', labelKey: 'fontOptionPoppins' }
    ]
  },
  {
    id: 'voiceColorSelector', key: 'voiceColor',
    options: [
      { value: 'default', labelKey: 'voiceColorOptionDefault', color: '#8EBBFF' },
      { value: 'orange', labelKey: 'voiceColorOptionOrange', color: '#FF9900' },
      { value: 'yellow', labelKey: 'voiceColorOptionYellow', color: '#FFD700' },
      { value: 'pink', labelKey: 'voiceColorOptionPink', color: '#FF69B4' },
      { value: 'green', labelKey: 'voiceColorOptionGreen', color: '#32CD32' },
      { value: 'dark', labelKey: 'voiceColorOptionDark', color: '#555555' }
    ]
  },
  {
    id: 'defaultModelSelector', key: 'defaultModel',
    options: [
      { value: '', labelKey: 'defaultModelOptionNone' },
      { value: 'gpt-5', label: 'Auto' },
      { value: 'gpt-5-thinking', label: 'GPT-5 Thinking' },
      { value: 'gpt-5-thinking-mini', label: 'GPT-5 Thinking mini' },
      { value: 'gpt-5-thinking-instant', label: 'GPT-5 Instant' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'o3', label: 'o3' },
      { value: 'o4-mini', label: 'o4-mini' },
      { value: '__custom__', labelKey: 'defaultModelOptionCustom' }
    ],
    mapVal: (v) => {
      if (!v) return '';
      const known = ['gpt-5', 'gpt-5-thinking', 'gpt-5-thinking-mini', 'gpt-5-thinking-instant', 'gpt-4o', 'gpt-4.1', 'o3', 'o4-mini', ''];
      return known.includes(v) ? v : '__custom__';
    },
    onSelect: (val) => {
      if (val === '__custom__') {
        $.modelRow.hidden = false;
        $.modelInput?.focus();
      } else {
        $.modelRow.hidden = true;
        if ($.modelInput) $.modelInput.value = '';
        chrome.storage.sync.set({ defaultModel: val });
      }
    }
  },
  {
    id: 'snowTypeSelector', key: 'snowType',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'chatgpt-logo', label: 'Chatgptsnow' }
    ]
  }
];

function initOrUpdateSelects(settings) {
  SELECT_CONFIGS.forEach(cfg => {
    const container = $.selects[cfg.id];
    if (!container) return;

    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optsContainer = container.querySelector('.select-options');
    const dot = trigger?.querySelector('.color-dot');

    if (!trigger || !optsContainer) return;

    const val = settings[cfg.key];
    const effectiveVal = cfg.mapVal ? cfg.mapVal(val) : val;
    const activeOpt = cfg.options.find(o => o.value === effectiveVal) || cfg.options[0];

    // Update trigger label
    if (label) {
      label.textContent = activeOpt.labelKey ? getMessage(activeOpt.labelKey) : (activeOpt.label || activeOpt.value);
    }

    // Update color dot if present
    if (dot) {
      dot.style.display = activeOpt.color ? 'block' : 'none';
      if (activeOpt.color) dot.style.backgroundColor = activeOpt.color;
    }

    // Build options ONLY ONCE (check if already built)
    if (!container.dataset.built) {
      container.dataset.built = 'true';

      // Build options HTML
      optsContainer.innerHTML = cfg.options.filter(o => !o.hidden).map(opt => {
        const txt = opt.labelKey ? getMessage(opt.labelKey) : (opt.label || opt.value);
        const dotHtml = opt.color ? `<span class="color-dot" style="background-color:${opt.color};display:block;"></span>` : '';
        return `<div class="select-option" data-value="${opt.value}">${dotHtml}<span>${txt}</span></div>`;
      }).join('');

      // Attach trigger click listener ONCE
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllSelects();
        container.classList.add('is-open');
        optsContainer.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
      });

      // Attach option click listeners ONCE using event delegation
      optsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.select-option');
        if (!option) return;

        const selectedVal = option.dataset.value;
        if (cfg.onSelect) {
          cfg.onSelect(selectedVal);
        } else {
          chrome.storage.sync.set({ [cfg.key]: selectedVal });
        }

        // Update label immediately (optimistic)
        if (label) label.textContent = option.textContent.trim();
        closeAllSelects();
      });
    }

    // Update selected state on options
    optsContainer.querySelectorAll('.select-option').forEach(el => {
      el.setAttribute('aria-selected', el.dataset.value === effectiveVal);
    });
  });
}

function closeAllSelects() {
  Object.values($.selects).forEach(el => {
    if (!el) return;
    el.classList.remove('is-open');
    const opts = el.querySelector('.select-options');
    if (opts) opts.style.display = 'none';
    const trigger = el.querySelector('.select-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

// Close selects on outside click
document.addEventListener('click', closeAllSelects);

// --- Event Listeners (Setup ONCE) ---
function setupChangeListeners() {
  // Toggles - event delegation on body
  TOGGLE_KEYS.forEach(key => {
    const el = $.toggles?.[key];
    if (el) {
      el.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: el.checked });
      });
    }
  });

  // Holiday Mode toggle (combines snowfall + garland + Christmas background)
  if ($.holidayMode) {
    $.holidayMode.addEventListener('change', () => {
      const isOn = $.holidayMode.checked;
      const updates = {
        enableSnowfall: isOn,
        enableNewYear: isOn,
        customBgUrl: isOn ? CHRISTMAS_BG_URL : ''
      };
      chrome.storage.sync.set(updates);
      // Also update individual toggles visually
      if ($.toggles?.enableSnowfall) $.toggles.enableSnowfall.checked = isOn;
      if ($.toggles?.enableNewYear) $.toggles.enableNewYear.checked = isOn;
    });
  }

  // Slider with debounce
  if ($.blurSlider) {
    let sliderTimeout;
    $.blurSlider.addEventListener('input', () => {
      $.blurValue.textContent = $.blurSlider.value;
      clearTimeout(sliderTimeout);
      sliderTimeout = setTimeout(() => {
        chrome.storage.sync.set({ backgroundBlur: $.blurSlider.value });
      }, 150);
    });
  }

  // BG URL
  if ($.bgUrl) {
    $.bgUrl.addEventListener('change', () => {
      const val = $.bgUrl.value.trim();
      if (val !== '__local__' && val !== '__gpt5_animated__') {
        chrome.storage.local.remove(LOCAL_BG_KEY);
      }
      chrome.storage.sync.set({ customBgUrl: val });
    });
  }

  // BG File
  if ($.bgFile) {
    $.bgFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(getMessage('alertFileTooLarge') || 'File too large (Max 15MB)');
        $.bgFile.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        chrome.storage.local.set({ [LOCAL_BG_KEY]: ev.target.result }, () => {
          if (chrome.runtime.lastError) {
            alert("Error saving image: " + chrome.runtime.lastError.message);
          } else {
            chrome.storage.sync.set({ customBgUrl: '__local__' });
          }
        });
      };
      reader.readAsDataURL(file);
      $.bgFile.value = '';
    });
  }

  // Reset
  if ($.clearBg) {
    $.clearBg.addEventListener('click', () => {
      chrome.storage.sync.set({
        customBgUrl: DEFAULTS.customBgUrl,
        backgroundBlur: DEFAULTS.backgroundBlur,
        backgroundScaling: DEFAULTS.backgroundScaling
      });
      chrome.storage.local.remove(LOCAL_BG_KEY);
      if ($.blurSlider) {
        $.blurSlider.value = DEFAULTS.backgroundBlur;
        $.blurValue.textContent = DEFAULTS.backgroundBlur;
      }
      if ($.bgUrl) $.bgUrl.value = '';
    });
  }

  // Custom Model Text
  if ($.modelInput) {
    $.modelInput.addEventListener('change', () => {
      chrome.storage.sync.set({ defaultModel: $.modelInput.value.trim() });
    });
  }

  // Search with debounce
  if ($.settingsSearch) {
    let searchTimeout;
    $.settingsSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(handleSearch, 50);
    });
    if ($.clearSearchBtn) {
      $.clearSearchBtn.addEventListener('click', () => {
        $.settingsSearch.value = '';
        handleSearch();
        $.settingsSearch.focus();
      });
    }
  }
}

// --- Static Setup Functions ---
function applyLocalization() {
  $.i18nElements?.forEach(el => el.textContent = getMessage(el.dataset.i18n));
  $.i18nPlaceholders?.forEach(el => el.placeholder = getMessage(el.dataset.i18nPlaceholder));
  $.i18nTitles?.forEach(el => el.title = getMessage(el.dataset.i18nTitle));
}

function setupTabs() {
  $.tabs?.forEach(tab => {
    tab.addEventListener('click', () => {
      $.tabs.forEach(t => t.classList.remove('active'));
      $.panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// --- Search Logic ---
let searchableData = [];

function buildSearchableData() {
  searchableData = [];
  $.panes?.forEach(pane => {
    const tabName = document.querySelector(`.tab-link[data-tab="${pane.id}"]`)?.textContent || '';
    pane.querySelectorAll('.row').forEach(row => {
      const label = row.querySelector('.label')?.textContent || '';
      const keywords = (tabName + ' ' + label + ' ' + (row.querySelector('[title]')?.title || '')).toLowerCase();
      searchableData.push({ element: row, tabId: pane.id, keywords });
    });
  });
}

function handleSearch() {
  const query = $.settingsSearch?.value.toLowerCase().trim() || '';
  if ($.clearSearchBtn) $.clearSearchBtn.hidden = !query;

  if (!query) {
    if ($.tabNav) $.tabNav.hidden = false;
    $.panes?.forEach(p => p.classList.remove('active'));
    $.tabs?.forEach(t => t.classList.remove('active', 'is-hidden'));
    $.rows?.forEach(r => r.classList.remove('is-hidden'));
    $.tabs?.[0]?.click();
    return;
  }

  if ($.tabNav) $.tabNav.hidden = false;
  const matchedTabIds = new Set();

  searchableData.forEach(item => {
    const match = item.keywords.includes(query);
    item.element.classList.toggle('is-hidden', !match);
    if (match) matchedTabIds.add(item.tabId);
  });

  $.tabs?.forEach(tab => {
    tab.classList.toggle('is-hidden', !matchedTabIds.has(tab.dataset.tab));
  });

  const first = document.querySelector('.tab-link:not(.is-hidden)');
  if (first) first.click();
}

// --- Import/Export ---
function setupImportExport() {
  if ($.exportSettings) {
    $.exportSettings.addEventListener('click', () => {
      chrome.storage.sync.get(null, (items) => {
        $.settingsJson.value = JSON.stringify(items, null, 2);
        $.importExportRow.hidden = false;
        navigator.clipboard.writeText($.settingsJson.value);
        $.exportSettings.textContent = getMessage('buttonCopied') || 'Copied!';
        setTimeout(() => $.exportSettings.textContent = getMessage('buttonExportSettings') || 'Export', 2000);
      });
    });
  }

  if ($.importSettings) {
    $.importSettings.addEventListener('click', () => {
      if ($.importExportRow.hidden) {
        $.importExportRow.hidden = false;
        $.settingsJson?.focus();
        return;
      }
      try {
        const data = JSON.parse($.settingsJson.value);
        chrome.storage.sync.set(data, () => {
          $.importSettings.textContent = 'Imported!';
          setTimeout(() => {
            $.importSettings.textContent = getMessage('buttonImportSettings') || 'Import';
            $.importExportRow.hidden = true;
            location.reload();
          }, 1000);
        });
      } catch (e) {
        alert('Invalid JSON');
      }
    });
  }
}

// --- Feedback System ---
function setupFeedbackSystem() {
  if (!$.feedbackTrigger) return;

  const generateTicketId = () => 'AUR-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  $.feedbackTrigger.addEventListener('click', () => {
    $.feedbackBox.hidden = false;
    $.feedbackTrigger.hidden = true;
    $.feedbackInput?.focus();
  });

  const resetFeedbackUI = () => {
    $.feedbackBox.hidden = true;
    $.feedbackTrigger.hidden = false;
    $.feedbackStatus.hidden = true;
    $.feedbackStatus.textContent = '';
    $.feedbackStatus.className = 'feedback-status';
  };

  $.closeFeedback?.addEventListener('click', resetFeedbackUI);

  $.closeDonationModal?.addEventListener('click', () => {
    $.donationModal.hidden = true;
    resetFeedbackUI();
  });

  $.copyTicketBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText($.ticketIdDisplay.textContent);
    $.copyFeedback?.classList.add('visible');
    setTimeout(() => $.copyFeedback?.classList.remove('visible'), 2000);
  });

  $.sendFeedback?.addEventListener('click', async () => {
    const text = $.feedbackInput?.value.trim();
    if (!text) return;

    $.sendFeedback.disabled = true;
    $.sendFeedback.textContent = getMessage('feedbackSending') || 'Sending...';
    $.feedbackStatus.hidden = true;

    const ticketId = generateTicketId();

    try {
      const manifest = chrome.runtime.getManifest();
      const response = await fetch(FEEDBACK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: text,
          version: manifest.version,
          userAgent: navigator.userAgent,
          ticketId: ticketId
        })
      });

      if (response.ok) {
        $.ticketIdDisplay.textContent = '#' + ticketId;
        $.donationModal.hidden = false;
        $.feedbackInput.value = '';
        $.feedbackBox.hidden = true;
      } else {
        throw new Error('Server Error');
      }
    } catch (err) {
      console.error(err);
      $.feedbackStatus.textContent = getMessage('feedbackError') || 'Failed. Try again.';
      $.feedbackStatus.className = 'feedback-status error';
      $.feedbackStatus.hidden = false;
    } finally {
      $.sendFeedback.disabled = false;
      $.sendFeedback.textContent = getMessage('feedbackSend') || 'Send Feedback';
    }
  });
}

// --- Live Storage Listener (Keep popup in sync) ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS_FULL' }, (response) => {
      if (response && !chrome.runtime.lastError) {
        const { settings, local } = response;
        renderUi(settings || DEFAULTS, local || {});
      }
    });
  }
});