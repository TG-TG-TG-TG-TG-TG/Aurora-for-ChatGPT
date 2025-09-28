// popup.js - controls settings

const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const GROK_HORIZON_URL = chrome?.runtime?.getURL
  ? chrome.runtime.getURL('Aurora/grok-4.webp')
  : 'Aurora/grok-4.webp'; // Add this line
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getMessage = (key, substitutions) => {
  if (chrome?.i18n?.getMessage) {
    const text = chrome.i18n.getMessage(key, substitutions);
    if (text) return text;
  }
  return key;
};

document.addEventListener('DOMContentLoaded', () => {
  let settingsCache = {}; // Cache for current settings to enable synchronous checks and quick updates.
  let DEFAULTS_CACHE = {}; // Add this line

  document.title = getMessage('popupTitle');

  const applyStaticLocalization = () => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const message = getMessage(key);
      if (message) el.textContent = message;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const message = getMessage(key);
      if (message) el.setAttribute('placeholder', message);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const message = getMessage(key);
      if (message) el.setAttribute('title', message);
    });
  };

  applyStaticLocalization();

  // --- Data-driven configuration for all toggle switches ---
  const TOGGLE_CONFIG = [
    { id: 'legacyComposer', key: 'legacyComposer' },
    { id: 'hideGpt5Limit', key: 'hideGpt5Limit' },
    { id: 'hideUpgradeButtons', key: 'hideUpgradeButtons' },
    { id: 'disableAnimations', key: 'disableAnimations' },
    { id: 'disableBgAnimation', key: 'disableBgAnimation' },
    { id: 'focusMode', key: 'focusMode' },
    { id: 'hideQuickSettings', key: 'hideQuickSettings' },
    { id: 'hideGptsButton', key: 'hideGptsButton' },
    { id: 'hideSoraButton', key: 'hideSoraButton' },
    { id: 'cuteVoiceUI', key: 'cuteVoiceUI' },
    { id: 'showInNewChatsOnly', key: 'showInNewChatsOnly' },
  ];

  // --- Initialize all toggle switch event listeners from the config ---
  TOGGLE_CONFIG.forEach(({ id, key }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
      });
    }
  });

  // --- Get other UI elements ---
  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');

  // --- Reusable Custom Select Functionality ---
  function createCustomSelect(containerId, options, storageKey, onPresetChange) {
    const container = document.getElementById(containerId);
    if (!container) return { update: () => {} };
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optionsContainer = container.querySelector('.select-options');
    const dotInTrigger = trigger.querySelector('.color-dot');

    const resolveLabel = (option) => option.labelKey ? getMessage(option.labelKey) : (option.label || option.value);

    function renderOptions(selectedValue) {
      optionsContainer.innerHTML = options
        .filter(option => !option.hidden)
        .map(option => {
            const colorDotHtml = option.color ? `<span class="color-dot" style="background-color: ${option.color}; display: block;"></span>` : '';
            const optionLabel = resolveLabel(option);
            const isSelected = option.value === selectedValue ? 'true' : 'false';
            return `
            <div class="select-option" role="option" data-value="${option.value}" aria-selected="${isSelected}">
              ${colorDotHtml}
              <span class="option-label">${optionLabel}</span>
            </div>
            `;
        }).join('');

      optionsContainer.querySelectorAll('.select-option').forEach(optionEl => {
        optionEl.addEventListener('click', () => {
          const newValue = optionEl.dataset.value;
          chrome.storage.sync.set({ [storageKey]: newValue });
          if (onPresetChange) {
            onPresetChange(newValue);
          }
          closeAllSelects();
        });
      });
    }

    function updateSelectorState(value) {
      const selectedOption = options.find(opt => opt.value === value) || options[0];
      const selectedLabel = resolveLabel(selectedOption);

      if (dotInTrigger) {
        if (selectedOption.color) {
          dotInTrigger.style.backgroundColor = selectedOption.color;
          dotInTrigger.style.display = 'block';
        } else {
          dotInTrigger.style.display = 'none';
        }
      }

      label.textContent = selectedLabel;
      renderOptions(value);
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      closeAllSelects();
      if (!isExpanded) {
          container.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          optionsContainer.style.display = 'block';
      }
    });

    return { update: updateSelectorState };
  }

  function closeAllSelects() {
    document.querySelectorAll('.custom-select').forEach(sel => {
        sel.classList.remove('is-open');
        const trigger = sel.querySelector('.select-trigger');
        const optionsContainer = sel.querySelector('.select-options');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (optionsContainer) optionsContainer.style.display = 'none';
    });
  }
  document.addEventListener('click', closeAllSelects);

  // --- Initialize Custom Selects ---
  const bgPresetOptions = [
    { value: 'default', labelKey: 'bgPresetOptionDefault' },
    { value: '__gpt5_animated__', labelKey: 'bgPresetOptionGpt5Animated' },
    { value: 'grokHorizon', labelKey: 'bgPresetOptionGrokHorizon' }, // Add this line
    { value: 'blue', labelKey: 'bgPresetOptionBlue' },
    { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, 'customBgUrl', (value) => {
    let newUrl = '';
    if (value === 'blue') {
      newUrl = BLUE_WALLPAPER_URL;
    } else if (value === '__gpt5_animated__') {
      newUrl = '__gpt5_animated__';
    } else if (value === 'grokHorizon') { // Add this else-if block
      newUrl = GROK_HORIZON_URL;
    }

    if (value !== 'custom') {
        chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set({ customBgUrl: newUrl });
  });

  const bgScalingOptions = [
    { value: 'contain', labelKey: 'bgScalingOptionContain' },
    { value: 'cover', labelKey: 'bgScalingOptionCover' }
  ];
  const bgScalingSelect = createCustomSelect('bgScalingSelector', bgScalingOptions, 'backgroundScaling');

  const themeOptions = [
    { value: 'auto', labelKey: 'themeOptionAuto' },
    { value: 'light', labelKey: 'themeOptionLight' },
    { value: 'dark', labelKey: 'themeOptionDark' }
  ];
  const themeSelect = createCustomSelect('themeSelector', themeOptions, 'theme');

  // ADD THESE LINES
  const appearanceOptions = [
    { value: 'dimmed', labelKey: 'glassAppearanceOptionDimmed' },
    { value: 'clear', labelKey: 'glassAppearanceOptionClear' }
  ];
  const appearanceSelect = createCustomSelect('appearanceSelector', appearanceOptions, 'appearance');
  // END OF ADDED SECTION

  const voiceColorOptions = [
    { value: 'default', labelKey: 'voiceColorOptionDefault', color: '#8EBBFF' },
    { value: 'orange', labelKey: 'voiceColorOptionOrange', color: '#FF9900' },
    { value: 'yellow', labelKey: 'voiceColorOptionYellow', color: '#FFD700' },
    { value: 'pink', labelKey: 'voiceColorOptionPink', color: '#FF69B4' },
    { value: 'green', labelKey: 'voiceColorOptionGreen', color: '#32CD32' },
    { value: 'dark', labelKey: 'voiceColorOptionDark', color: '#555555' }
  ];
  const voiceColorSelect = createCustomSelect('voiceColorSelector', voiceColorOptions, 'voiceColor');

  // --- Function to update the UI based on current settings ---
  async function updateUi(settings) {
    let isLightTheme = settings.theme === 'light';
    if (settings.theme === 'auto') {
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get('detectedTheme', (res) => {
            if (chrome.runtime.lastError) {
              console.error("Aurora Popup Error (updateUi):", chrome.runtime.lastError.message);
              return reject(chrome.runtime.lastError);
            }
            resolve(res);
          });
        });
        isLightTheme = result.detectedTheme === 'light';
      } catch (e) {
        // Error is logged, default to dark theme for 'auto' on error.
        isLightTheme = false;
      }
    }
    document.documentElement.classList.toggle('theme-light', isLightTheme);

    TOGGLE_CONFIG.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) {
        element.checked = !!settings[key];
      }
    });
    
    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;

    bgScalingSelect.update(settings.backgroundScaling);
    themeSelect.update(settings.theme);
    appearanceSelect.update(settings.appearance || 'dimmed'); // Add this line
    voiceColorSelect.update(settings.voiceColor);

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;
    tbBgUrl.value = '';

    if (!url) {
      bgPresetSelect.update('default');
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPresetSelect.update('blue');
    } else if (url === GROK_HORIZON_URL) { // Add this else-if block
      bgPresetSelect.update('grokHorizon');
    } else if (url === '__gpt5_animated__') {
      bgPresetSelect.update('__gpt5_animated__');
      tbBgUrl.value = getMessage('statusAnimatedBackground');
      tbBgUrl.disabled = true;
    } else if (url === '__local__') {
      bgPresetSelect.update('custom');
      tbBgUrl.value = getMessage('statusLocalFileInUse');
      tbBgUrl.disabled = true;
    } else {
      bgPresetSelect.update('custom');
      tbBgUrl.value = url;
    }
  }

  // --- Initial Load ---
  if (chrome.runtime?.sendMessage) {
    // Fetch the DEFAULTS object from the background script first
    chrome.runtime.sendMessage({ type: 'GET_DEFAULTS' }, (defaults) => {
      if (chrome.runtime.lastError) {
        console.error("Aurora Popup Error (Fetching Defaults):", chrome.runtime.lastError.message);
        // Fallback to hardcoded values if the message fails
        DEFAULTS_CACHE = { customBgUrl: '', backgroundBlur: '60', backgroundScaling: 'cover' };
      } else {
        DEFAULTS_CACHE = defaults;
      }

      // Now, fetch the user's current settings
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
        if (chrome.runtime.lastError) {
          console.error("Aurora Popup Error (Initial Load):", chrome.runtime.lastError.message);
          document.body.innerHTML = `<div style="padding: 20px; text-align: center;">${getMessage('errorLoadingSettings')}</div>`;
          return;
        }
        settingsCache = settings;
        updateUi(settings);
      });
    });
  }

  // --- Event Listeners for Custom Background ---
  blurSlider.addEventListener('input', () => {
    blurValue.textContent = blurSlider.value;
  });
  blurSlider.addEventListener('change', () => {
    chrome.storage.sync.set({ backgroundBlur: blurSlider.value });
  });

  tbBgUrl.addEventListener('change', () => {
    const urlValue = tbBgUrl.value.trim();
    const newSettings = { customBgUrl: urlValue };
    if(urlValue !== '__local__' && urlValue !== GROK_HORIZON_URL) {
        chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set(newSettings);
  });

  fileBg.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(getMessage('alertFileTooLarge', String(MAX_FILE_SIZE_MB)));
      fileBg.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      chrome.storage.local.set({ [LOCAL_BG_KEY]: dataUrl }, () => {
        chrome.storage.sync.set({ customBgUrl: '__local__' });
      });
    };
    reader.readAsDataURL(file);
    fileBg.value = '';
  });

  btnClearBg.addEventListener('click', () => {
    chrome.storage.sync.set({
      customBgUrl: DEFAULTS_CACHE.customBgUrl,
      backgroundBlur: DEFAULTS_CACHE.backgroundBlur,
      backgroundScaling: DEFAULTS_CACHE.backgroundScaling
    });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      let needsFullUpdate = false;
      for (const key in changes) {
        if (Object.prototype.hasOwnProperty.call(settingsCache, key)) {
          settingsCache[key] = changes[key].newValue;
          needsFullUpdate = true;
        }
      }
      if (needsFullUpdate) {
        updateUi(settingsCache);
      }
    }

    if (area === 'local' && changes.detectedTheme) {
      if (settingsCache.theme === 'auto') {
        document.documentElement.classList.toggle('theme-light', changes.detectedTheme.newValue === 'light');
      }
    }
  });
});