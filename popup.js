// popup.js - controls settings
const DEFAULTS = {
  legacyComposer: false,
  theme: 'auto',
  appearance: 'dimmed',
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
  disableBgAnimation: false,
  focusMode: false,
  hideQuickSettings: false,
  customBgUrl: '',
  backgroundBlur: '60',
  backgroundScaling: 'contain',
  hideGptsButton: false,
  hideSoraButton: false,
  voiceColor: 'default',
  cuteVoiceUI: false,
  showInNewChatsOnly: false
};

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

  // --- Get all UI elements ---
  const cbLegacy = document.getElementById('legacyComposer');
  const cbGpt5Limit = document.getElementById('hideGpt5Limit');
  const cbUpgradeButtons = document.getElementById('hideUpgradeButtons');
  const cbDisableAnimations = document.getElementById('disableAnimations');
  const cbDisableBgAnimation = document.getElementById('disableBgAnimation');
  const cbFocusMode = document.getElementById('focusMode');
  const cbHideQuickSettings = document.getElementById('hideQuickSettings');
  const cbGptsButton = document.getElementById('hideGptsButton');
  const cbSoraButton = document.getElementById('hideSoraButton');
  const cbCuteVoice = document.getElementById('cuteVoiceUI');
  const cbShowInNewChatsOnly = document.getElementById('showInNewChatsOnly');

  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');

  // --- Reusable Custom Select Functionality ---
  function createCustomSelect(containerId, options, storageKey, onPresetChange) {
    const container = document.getElementById(containerId);
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
    { value: 'grokHorizon', labelKey: 'bgPresetOptionGrokHorizon' },
    { value: 'blue', labelKey: 'bgPresetOptionBlue' },
    { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, 'customBgUrl', (value) => {
    let newUrl = '';
    if (value === 'blue') {
      newUrl = BLUE_WALLPAPER_URL;
    } else if (value === 'grokHorizon') {
      newUrl = GROK_HORIZON_URL;
    }

    if (value !== 'custom') {
      chrome.storage.local.remove(LOCAL_BG_KEY);
      chrome.storage.sync.set({ customBgUrl: newUrl });
    }
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
    { value: 'dimmed', labelKey: 'glassAppearanceOptionDimmed' },
    { value: 'clear', labelKey: 'glassAppearanceOptionClear' }
  ];
  const appearanceSelect = createCustomSelect('appearanceSelector', appearanceOptions, 'appearance');

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
    if (settings.theme === 'auto') {
      const { detectedTheme } = await new Promise(resolve => chrome.storage.local.get('detectedTheme', resolve));
      document.documentElement.classList.toggle('theme-light', detectedTheme === 'light');
    } else {
      document.documentElement.classList.toggle('theme-light', settings.theme === 'light');
    }
    cbLegacy.checked = !!settings.legacyComposer;
    cbGpt5Limit.checked = !!settings.hideGpt5Limit;
    cbUpgradeButtons.checked = !!settings.hideUpgradeButtons;
    cbDisableAnimations.checked = !!settings.disableAnimations;
    cbDisableBgAnimation.checked = !!settings.disableBgAnimation;
    cbFocusMode.checked = !!settings.focusMode;
    cbHideQuickSettings.checked = !!settings.hideQuickSettings;
    cbGptsButton.checked = !!settings.hideGptsButton;
    cbSoraButton.checked = !!settings.hideSoraButton;
    cbCuteVoice.checked = !!settings.cuteVoiceUI;
    cbShowInNewChatsOnly.checked = !!settings.showInNewChatsOnly;
    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;

    bgScalingSelect.update(settings.backgroundScaling);
    themeSelect.update(settings.theme);
    appearanceSelect.update(settings.appearance || 'dimmed');
    voiceColorSelect.update(settings.voiceColor);

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;
    tbBgUrl.value = '';

    if (!url) {
      bgPresetSelect.update('default');
    } else if (url === GROK_HORIZON_URL) {
      bgPresetSelect.update('grokHorizon');
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPresetSelect.update('blue');
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
  chrome.storage.sync.get(DEFAULTS, updateUi);

  // --- Event Listeners for Toggles ---
  cbLegacy.addEventListener('change', () => chrome.storage.sync.set({ legacyComposer: cbLegacy.checked }));
  cbGpt5Limit.addEventListener('change', () => chrome.storage.sync.set({ hideGpt5Limit: cbGpt5Limit.checked }));
  cbUpgradeButtons.addEventListener('change', () => chrome.storage.sync.set({ hideUpgradeButtons: cbUpgradeButtons.checked }));
  cbDisableAnimations.addEventListener('change', () => chrome.storage.sync.set({ disableAnimations: cbDisableAnimations.checked }));
  cbDisableBgAnimation.addEventListener('change', () => chrome.storage.sync.set({ disableBgAnimation: cbDisableBgAnimation.checked }));
  cbFocusMode.addEventListener('change', () => chrome.storage.sync.set({ focusMode: cbFocusMode.checked }));
  cbHideQuickSettings.addEventListener('change', () => chrome.storage.sync.set({ hideQuickSettings: cbHideQuickSettings.checked }));
  cbGptsButton.addEventListener('change', () => chrome.storage.sync.set({ hideGptsButton: cbGptsButton.checked }));
  cbSoraButton.addEventListener('change', () => chrome.storage.sync.set({ hideSoraButton: cbSoraButton.checked }));
  cbCuteVoice.addEventListener('change', () => chrome.storage.sync.set({ cuteVoiceUI: cbCuteVoice.checked }));
  cbShowInNewChatsOnly.addEventListener('change', () => chrome.storage.sync.set({ showInNewChatsOnly: cbShowInNewChatsOnly.checked }));

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
    if(urlValue !== '__local__') {
        chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set(newSettings);
  });

  fileBg.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(getMessage('alertFileTooLarge', MAX_FILE_SIZE_MB.toString()));
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
      customBgUrl: '',
      backgroundBlur: DEFAULTS.backgroundBlur,
      backgroundScaling: DEFAULTS.backgroundScaling
    });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' || area === 'local') {
      chrome.storage.sync.get(DEFAULTS, updateUi);
    }
  });
});