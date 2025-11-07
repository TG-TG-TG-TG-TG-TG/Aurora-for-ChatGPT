// popup.js - controls settings

const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const GROK_HORIZON_URL = chrome?.runtime?.getURL
  ? chrome.runtime.getURL('Aurora/grok-4.webp')
  : 'Aurora/grok-4.webp';
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
  let searchableSettings = []; // New: For search functionality

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
  
  // --- New: Tab Switching Logic ---
  const tabs = document.querySelectorAll('.tab-link');
  const panes = document.querySelectorAll('.tab-pane');
  const mainContent = document.querySelector('.tab-content');
  const tabNav = document.querySelector('.tab-nav');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPaneId = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panes.forEach(pane => {
        pane.classList.toggle('active', pane.id === targetPaneId);
      });
    });
  });

  // --- New: Search Functionality ---
  const searchInput = document.getElementById('settingsSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let noResultsMessage = null;

  function buildSearchableData() {
    searchableSettings = [];
    document.querySelectorAll('.tab-pane').forEach(pane => {
      const tabId = pane.id;
      const tabTitle = document.querySelector(`.tab-link[data-tab="${tabId}"]`)?.textContent || '';
      pane.querySelectorAll('.row').forEach(row => {
        const label = row.querySelector('.label')?.getAttribute('data-i18n');
        const tooltip = row.querySelector('[data-i18n-title]')?.getAttribute('data-i18n-title');

        let keywords = `${tabTitle} `;
        if (label) keywords += getMessage(label) + ' ';
        if (tooltip) keywords += getMessage(tooltip) + ' ';

        searchableSettings.push({
          element: row,
          tab: tabId,
          keywords: keywords.toLowerCase().trim()
        });
      });
    });
  }

  function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    const matchedTabs = new Set();
    let matchCount = 0;

    clearSearchBtn.hidden = !query;

    if (!query) {
      resetSearchView();
      return;
    }

    // Hide everything first
    panes.forEach(p => p.classList.remove('active'));
    tabs.forEach(t => t.classList.add('is-hidden'));

    searchableSettings.forEach(setting => {
      const isMatch = setting.keywords.includes(query);
      setting.element.classList.toggle('is-hidden', !isMatch);
      if (isMatch) {
        matchedTabs.add(setting.tab);
        matchCount++;
      }
    });

    if (matchCount > 0) {
      // Show tabs that have matches
      tabNav.hidden = false;
      if (noResultsMessage) noResultsMessage.style.display = 'none';

      tabs.forEach(tab => {
        const tabId = tab.dataset.tab;
        const hasMatch = matchedTabs.has(tabId);
        tab.classList.toggle('is-hidden', !hasMatch);
      });

      // Activate the first tab with a match
      const firstMatchedTab = document.querySelector('.tab-link:not(.is-hidden)');
      if (firstMatchedTab) {
        firstMatchedTab.click();
      }
    } else {
      // No results found
      tabNav.hidden = true;
      if (!noResultsMessage) {
        noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results-message';
        noResultsMessage.textContent = getMessage('noResults');
        mainContent.appendChild(noResultsMessage);
      }
      noResultsMessage.style.display = 'block';
    }
  }

  function resetSearchView() {
    tabNav.hidden = false;
    if (noResultsMessage) noResultsMessage.style.display = 'none';

    searchableSettings.forEach(setting => setting.element.classList.remove('is-hidden'));
    tabs.forEach(tab => tab.classList.remove('is-hidden'));
    
    // Restore default tab view
    const activeTab = document.querySelector('.tab-link.active');
    if (!activeTab || activeTab.classList.contains('is-hidden')) {
      tabs[0]?.click();
    } else {
      activeTab.click(); // Re-click to ensure pane is active
    }
  }

  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch();
    searchInput.focus();
  });
  // End of Search Functionality

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
  const defaultModelCustomRow = document.getElementById('defaultModelCustomRow');
  const defaultModelCustomInput = document.getElementById('defaultModelCustomInput');

  // --- Rewritten Feature: Blur Slider Logic ---
  // This new logic uses a single 'input' event for real-time updates and efficient saving.
  // It completely replaces any old 'input' or 'change' listeners.
  if (blurSlider && blurValue) {
    blurSlider.addEventListener('input', () => {
      const newBlurValue = blurSlider.value;
      
      // 1. Instantly update the 'px' value in the UI.
      blurValue.textContent = newBlurValue;
      
      // 2. Save the value to storage. This automatically triggers the live
      // update on the main page via the storage.onChanged listener in content.js.
      chrome.storage.sync.set({ backgroundBlur: newBlurValue });
    });
  }


  // --- Reusable Custom Select Functionality ---
  function createCustomSelect(containerId, options, storageKey, onPresetChange, config = {}) {
    const container = document.getElementById(containerId);
    if (!container) return { update: () => {} };
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optionsContainer = container.querySelector('.select-options');
    const dotInTrigger = trigger.querySelector('.color-dot');
    const { manualStorage = false, mapValueToOption, formatLabel } = config;
    let currentOptionValue = null;
    let lastRawValue = null;

    const resolveLabel = (option, rawValue) => {
      if (!option) return rawValue || '';
      if (typeof option.getLabel === 'function') return option.getLabel(rawValue);
      if (typeof formatLabel === 'function') {
        const custom = formatLabel(option, rawValue);
        if (custom) return custom;
      }
      if (option.labelKey) return getMessage(option.labelKey);
      return option.label || option.value;
    };

    function renderOptions(selectedValue) {
      optionsContainer.innerHTML = options
        .filter(option => !option.hidden)
        .map(option => {
            const colorDotHtml = option.color ? `<span class="color-dot" style="background-color: ${option.color}; display: block;"></span>` : '';
            const optionLabel = resolveLabel(option, option.value);
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
          if (!manualStorage && storageKey) {
            chrome.storage.sync.set({ [storageKey]: newValue });
          }
          if (onPresetChange) {
            onPresetChange(newValue);
          }
          closeAllSelects();
        });
      });
    }

    function updateSelectorState(value) {
      lastRawValue = value;
      let mappedValue = value;
      if (typeof mapValueToOption === 'function') {
        mappedValue = mapValueToOption(value);
      }
      currentOptionValue = mappedValue;
      const selectedOption = options.find(opt => opt.value === mappedValue) || options[0];
      const selectedLabel = resolveLabel(selectedOption, value);

      if (dotInTrigger) {
        if (selectedOption.color) {
          dotInTrigger.style.backgroundColor = selectedOption.color;
          dotInTrigger.style.display = 'block';
        } else {
          dotInTrigger.style.display = 'none';
        }
      }

      label.textContent = selectedLabel;
      renderOptions(currentOptionValue);
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
    { value: 'clear', labelKey: 'glassAppearanceOptionClear' },
    { value: 'dimmed', labelKey: 'glassAppearanceOptionDimmed' }
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

  const defaultModelOptions = [
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
  ];

  function isCustomModelValue(value) {
    if (!value) return false;
    return !defaultModelOptions.some(opt => opt.value && opt.value === value);
  }

  const defaultModelSelect = createCustomSelect(
    'defaultModelSelector',
    defaultModelOptions,
    null,
    (selectedValue) => {
      if (selectedValue === '__custom__') {
        if (defaultModelCustomRow) {
          defaultModelCustomRow.hidden = false;
        }
        if (defaultModelCustomInput) {
          defaultModelCustomInput.focus();
        }
        const existingValue = settingsCache?.defaultModel || '';
        defaultModelSelect.update(existingValue || '');
        return;
      }
      if (defaultModelCustomRow) {
        defaultModelCustomRow.hidden = true;
      }
      if (defaultModelCustomInput) {
        defaultModelCustomInput.value = '';
      }
      chrome.storage.sync.set({ defaultModel: selectedValue });
      applyDefaultModelUiState(selectedValue);
    },
    {
      manualStorage: true,
      mapValueToOption: (rawValue) => {
        if (!rawValue) return '';
        const existing = defaultModelOptions.find(opt => opt.value === rawValue);
        return existing ? existing.value : '__custom__';
      },
      formatLabel: (option, rawValue) => {
        if (option.value === '__custom__') {
          if (rawValue && rawValue !== '__custom__') {
            const baseLabel = getMessage('defaultModelOptionCustomLabel');
            return `${baseLabel || 'Custom'} (${rawValue})`;
          }
          return getMessage('defaultModelOptionCustomLabel') || getMessage('defaultModelOptionCustom') || 'Custom';
        }
      }
    }
  );

  function applyDefaultModelUiState(rawValue) {
    const useCustom = isCustomModelValue(rawValue);
    if (defaultModelCustomRow) {
      defaultModelCustomRow.hidden = !useCustom;
    }
    if (defaultModelCustomInput) {
      defaultModelCustomInput.value = useCustom ? rawValue : '';
    }
    defaultModelSelect.update(rawValue || '');
  }

  if (defaultModelCustomInput) {
    const persistCustomModel = () => {
      const value = defaultModelCustomInput.value.trim();
      if (!value) {
        chrome.storage.sync.set({ defaultModel: '' });
        applyDefaultModelUiState('');
        return;
      }
      chrome.storage.sync.set({ defaultModel: value });
      applyDefaultModelUiState(value);
    };
    defaultModelCustomInput.addEventListener('blur', persistCustomModel);
    defaultModelCustomInput.addEventListener('change', persistCustomModel);
    defaultModelCustomInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        persistCustomModel();
        closeAllSelects();
      }
    });
  }

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
    appearanceSelect.update(settings.appearance || 'clear'); // Add this line
    voiceColorSelect.update(settings.voiceColor);
    applyDefaultModelUiState(settings.defaultModel || '');

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
        buildSearchableData(); // New: Build search index after UI and text is loaded
      });
    });
  }

  // --- Event Listeners for Custom Background ---
  
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

  // --- REWRITTEN & STABLE: Reset Button Logic ---
  // This completely replaces the old reset button logic. It is designed to be
  // atomic, reliable, and work perfectly with the new robust listener in content.js.
  if (btnClearBg) {
    btnClearBg.addEventListener('click', () => {
      // 1. Check if the defaults have been loaded. This is a safety measure.
      if (!DEFAULTS_CACHE || Object.keys(DEFAULTS_CACHE).length === 0) {
        console.error("Aurora Popup Error: Cannot reset because defaults are not loaded.");
        return;
      }
      
      // 2. Define the complete set of background settings to be reset.
      // We pull these directly from the DEFAULTS_CACHE, which is our source of truth.
      const settingsToReset = {
        customBgUrl: DEFAULTS_CACHE.customBgUrl,
        backgroundBlur: DEFAULTS_CACHE.backgroundBlur,
        backgroundScaling: DEFAULTS_CACHE.backgroundScaling
      };

      // 3. Execute all storage operations.
      // The `sync.set` will trigger the robust listener in content.js, causing the
      // website visuals to update correctly and reliably.
      chrome.storage.sync.set(settingsToReset);
      
      // The `local.remove` is a critical cleanup step for any user-provided files.
      chrome.storage.local.remove(LOCAL_BG_KEY);
      
      // 4. Provide immediate visual feedback in the popup UI.
      // While the storage.onChanged listener will also do this, updating the UI
      // manually here makes the reset feel instantaneous to the user.
      
      // Update the URL input box.
      tbBgUrl.value = '';
      
      // Update the blur slider and its text display.
      blurSlider.value = settingsToReset.backgroundBlur;
      blurValue.textContent = settingsToReset.backgroundBlur;

      // Update the custom dropdowns using their dedicated update functions.
      // This correctly resets the preset to "Default" and scaling to "Cover".
      bgPresetSelect.update('default'); // 'default' corresponds to an empty customBgUrl
      bgScalingSelect.update(settingsToReset.backgroundScaling);

      console.log("Aurora Settings: Background and blur have been reset to defaults.");
    });
  }


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
