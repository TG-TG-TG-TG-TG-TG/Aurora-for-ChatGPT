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
  let settingsCache = {};
  let DEFAULTS_CACHE = {};
  let searchableSettings = [];

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

  const searchInput = document.getElementById('settingsSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let noResultsMessage = null;

  function buildSearchableData() {
    searchableSettings = [];
    document.querySelectorAll('.tab-pane').forEach(pane => {
      const tabId = pane.id;
      const tabTitle = document.querySelector(`.tab-link[data-tab="${tabId}"]`)?.textContent || '';
      pane.querySelectorAll('.row').forEach(row => {
        const label = row.querySelector('.label')?.getAttribute('data-i18n') || row.querySelector('.label')?.textContent || '';
        const tooltip = row.querySelector('[data-i18n-title]')?.getAttribute('data-i18n-title') || row.querySelector('[title]')?.getAttribute('title') || '';

        let keywords = `${tabTitle} `;
        if (label) keywords += (getMessage(label) || label) + ' ';
        if (tooltip) keywords += (getMessage(tooltip) || tooltip) + ' ';

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
      tabNav.hidden = false;
      if (noResultsMessage) noResultsMessage.style.display = 'none';

      tabs.forEach(tab => {
        const tabId = tab.dataset.tab;
        const hasMatch = matchedTabs.has(tabId);
        tab.classList.toggle('is-hidden', !hasMatch);
      });

      const firstMatchedTab = document.querySelector('.tab-link:not(.is-hidden)');
      if (firstMatchedTab) {
        firstMatchedTab.click();
      }
    } else {
      tabNav.hidden = true;
      if (!noResultsMessage) {
        noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results-message';
        noResultsMessage.textContent = getMessage('noResults') || 'No results found';
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

    const activeTab = document.querySelector('.tab-link.active');
    if (!activeTab || activeTab.classList.contains('is-hidden')) {
      tabs[0]?.click();
    } else {
      activeTab.click();
    }
  }

  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch();
    searchInput.focus();
  });

  const TOGGLE_CONFIG = [
    { id: 'legacyComposer', key: 'legacyComposer' },
    { id: 'hideGpt5Limit', key: 'hideGpt5Limit' },
    { id: 'hideUpgradeButtons', key: 'hideUpgradeButtons' },
    { id: 'disableAnimations', key: 'disableAnimations' },
    { id: 'focusMode', key: 'focusMode' },
    { id: 'hideQuickSettings', key: 'hideQuickSettings' },
    { id: 'showTokenCounter', key: 'showTokenCounter' },
    { id: 'blurChatHistory', key: 'blurChatHistory' },
    { id: 'blurAvatar', key: 'blurAvatar' },
    { id: 'soundEnabled', key: 'soundEnabled' },
    { id: 'autoContrast', key: 'autoContrast' },
    { id: 'dataMaskingEnabled', key: 'dataMaskingEnabled' },
    { id: 'maskingRandomMode', key: 'maskingRandomMode' },
    { id: 'enableSnowfall', key: 'enableSnowfall' },
    { id: 'enableNewYear', key: 'enableNewYear' }
  ];

  TOGGLE_CONFIG.forEach(({ id, key }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
      });
    }
  });

  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');
  const defaultModelCustomRow = document.getElementById('defaultModelCustomRow');
  const defaultModelCustomInput = document.getElementById('defaultModelCustomInput');

  if (blurSlider && blurValue) {
    blurSlider.addEventListener('input', () => {
      const newBlurValue = blurSlider.value;
      blurValue.textContent = newBlurValue;
      chrome.storage.sync.set({ backgroundBlur: newBlurValue });
    });
  }

  function createCustomSelect(containerId, options, storageKey, onPresetChange, config = {}) {
    const container = document.getElementById(containerId);
    if (!container) return { update: () => { } };
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optionsContainer = container.querySelector('.select-options');
    const dotInTrigger = trigger.querySelector('.color-dot');
    const { manualStorage = false, mapValueToOption, formatLabel } = config;
    let currentOptionValue = null;

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

  const bgPresetOptions = [
    { value: 'default', labelKey: 'bgPresetOptionDefault' },
    { value: '__gpt5_animated__', labelKey: 'bgPresetOptionGpt5Animated' },
    { value: 'grokHorizon', labelKey: 'bgPresetOptionGrokHorizon' },
    { value: 'blue', labelKey: 'bgPresetOptionBlue' },
    { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, 'customBgUrl', (value) => {
    let newUrl = '';
    if (value === 'blue') {
      newUrl = BLUE_WALLPAPER_URL;
    } else if (value === '__gpt5_animated__') {
      newUrl = '__gpt5_animated__';
    } else if (value === 'grokHorizon') {
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

  const appearanceOptions = [
    { value: 'clear', labelKey: 'glassAppearanceOptionClear' },
    { value: 'dimmed', labelKey: 'glassAppearanceOptionDimmed' }
  ];
  const appearanceSelect = createCustomSelect('appearanceSelector', appearanceOptions, 'appearance');

  const fontOptions = [
    { value: 'system', labelKey: 'fontOptionSystem' },
    { value: 'inter', labelKey: 'fontOptionInter' },
    { value: 'roboto', labelKey: 'fontOptionRoboto' },
    { value: 'montserrat', labelKey: 'fontOptionMontserrat' },
    { value: 'opensans', labelKey: 'fontOptionOpenSans' },
    { value: 'poppins', labelKey: 'fontOptionPoppins' }
  ];
  const fontSelect = createCustomSelect('fontSelector', fontOptions, 'customFont');

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

  async function updateUi(settings) {
    let isLightTheme = settings.theme === 'light';
    if (settings.theme === 'auto') {
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.local.get('detectedTheme', (res) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            resolve(res);
          });
        });
        isLightTheme = result.detectedTheme === 'light';
      } catch (e) {
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
    appearanceSelect.update(settings.appearance || 'clear');
    fontSelect.update(settings.customFont || 'system');
    voiceColorSelect.update(settings.voiceColor);
    applyDefaultModelUiState(settings.defaultModel || '');

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;
    tbBgUrl.value = '';

    if (!url) {
      bgPresetSelect.update('default');
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPresetSelect.update('blue');
    } else if (url === GROK_HORIZON_URL) {
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

  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GET_DEFAULTS' }, (defaults) => {
      if (!chrome.runtime.lastError) {
        DEFAULTS_CACHE = defaults;
      }
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
        if (chrome.runtime.lastError) return;
        settingsCache = settings;
        updateUi(settings);
        buildSearchableData();
      });
    });
  }

  tbBgUrl.addEventListener('change', () => {
    const urlValue = tbBgUrl.value.trim();
    const newSettings = { customBgUrl: urlValue };
    if (urlValue !== '__local__' && urlValue !== GROK_HORIZON_URL) {
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

  if (btnClearBg) {
    btnClearBg.addEventListener('click', () => {
      if (!DEFAULTS_CACHE || Object.keys(DEFAULTS_CACHE).length === 0) return;

      const settingsToReset = {
        customBgUrl: DEFAULTS_CACHE.customBgUrl,
        backgroundBlur: DEFAULTS_CACHE.backgroundBlur,
        backgroundScaling: DEFAULTS_CACHE.backgroundScaling
      };

      chrome.storage.sync.set(settingsToReset);
      chrome.storage.local.remove(LOCAL_BG_KEY);

      tbBgUrl.value = '';
      blurSlider.value = settingsToReset.backgroundBlur;
      blurValue.textContent = settingsToReset.backgroundBlur;
      bgPresetSelect.update('default');
      bgScalingSelect.update(settingsToReset.backgroundScaling);
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

  const exportBtn = document.getElementById('exportSettings');
  const importBtn = document.getElementById('importSettings');
  const jsonTextarea = document.getElementById('settingsJson');
  const textareaRow = document.getElementById('importExportTextAreaRow');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
        if (chrome.runtime.lastError) return;
        const json = JSON.stringify(settings, null, 2);
        jsonTextarea.value = json;
        textareaRow.hidden = false;
        navigator.clipboard.writeText(json).then(() => {
          exportBtn.textContent = '✓ Copied!';
          setTimeout(() => { exportBtn.textContent = getMessage('buttonExportSettings') || 'Export Settings'; }, 2000);
        }).catch(() => { jsonTextarea.select(); });
      });
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      if (textareaRow.hidden) {
        textareaRow.hidden = false;
        jsonTextarea.focus();
        return;
      }
      const jsonString = jsonTextarea.value.trim();
      if (!jsonString) {
        alert('Please paste settings JSON first');
        return;
      }
      try {
        const importedSettings = JSON.parse(jsonString);
        if (typeof importedSettings !== 'object' || Array.isArray(importedSettings)) throw new Error('Invalid settings format');
        chrome.storage.sync.set(importedSettings, () => {
          if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message);
            return;
          }
          importBtn.textContent = '✓ Imported!';
          setTimeout(() => {
            importBtn.textContent = getMessage('buttonImportSettings') || 'Import Settings';
            textareaRow.hidden = true;
            jsonTextarea.value = '';
          }, 2000);
        });
      } catch (e) {
        alert('Invalid JSON format: ' + e.message);
      }
    });
  }

  /* --- Feedback System Logic --- */
  const FEEDBACK_API_URL = 'https://auroraforchatgpt.tnemoroccan.workers.dev';
  
  const feedbackTrigger = document.getElementById('feedbackTrigger');
  const feedbackBox = document.getElementById('feedbackBox');
  const closeFeedbackBtn = document.getElementById('closeFeedback');
  const sendFeedbackBtn = document.getElementById('sendFeedback');
  const feedbackInput = document.getElementById('feedbackInput');
  const feedbackStatus = document.getElementById('feedbackStatus');

  if (feedbackTrigger && feedbackBox) {
    feedbackTrigger.addEventListener('click', () => {
      feedbackBox.hidden = false;
      feedbackTrigger.hidden = true;
      feedbackInput.focus();
    });

    const closeFeedback = () => {
      feedbackBox.hidden = true;
      feedbackTrigger.hidden = false;
      feedbackStatus.hidden = true;
      feedbackStatus.textContent = '';
      feedbackStatus.className = 'feedback-status';
    };

    closeFeedbackBtn.addEventListener('click', closeFeedback);

    sendFeedbackBtn.addEventListener('click', async () => {
      const text = feedbackInput.value.trim();
      if (!text) return;

      sendFeedbackBtn.disabled = true;
      sendFeedbackBtn.textContent = getMessage('feedbackSending') || 'Sending...';
      feedbackStatus.hidden = true;

      try {
        const manifest = chrome.runtime.getManifest();
        const response = await fetch(FEEDBACK_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback: text,
            version: manifest.version,
            userAgent: navigator.userAgent
          })
        });

        if (response.ok) {
          feedbackStatus.textContent = getMessage('feedbackSuccess') || '✅ Thanks for your feedback!';
          feedbackStatus.className = 'feedback-status success';
          feedbackStatus.hidden = false;
          feedbackInput.value = '';
          setTimeout(closeFeedback, 2000);
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        console.error('Feedback error:', err);
        feedbackStatus.textContent = getMessage('feedbackError') || 'Failed to send. Please try again.';
        feedbackStatus.className = 'feedback-status error';
        feedbackStatus.hidden = false;
      } finally {
        sendFeedbackBtn.disabled = false;
        sendFeedbackBtn.textContent = getMessage('feedbackSend') || 'Send Feedback';
      }
    });
  }
});