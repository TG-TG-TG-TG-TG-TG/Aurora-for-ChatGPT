// popup.js — controls settings
const DEFAULTS = {
  legacyComposer: false,
  theme: 'auto',
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
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
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

document.addEventListener('DOMContentLoaded', () => {
  // --- Get all UI elements ---
  const cbLegacy = document.getElementById('legacyComposer');
  const cbGpt5Limit = document.getElementById('hideGpt5Limit');
  const cbUpgradeButtons = document.getElementById('hideUpgradeButtons');
  const cbDisableAnimations = document.getElementById('disableAnimations');
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

    function updateSelectorState(value) {
      const selectedOption = options.find(opt => opt.value === value) || options[0];
      
      const dotInTrigger = trigger.querySelector('.color-dot');
      if (dotInTrigger && selectedOption.color) {
        dotInTrigger.style.backgroundColor = selectedOption.color;
        dotInTrigger.style.display = 'block';
      } else if (dotInTrigger) {
        dotInTrigger.style.display = 'none';
      }
      
      label.textContent = selectedOption.label;
      optionsContainer.innerHTML = options
        .filter(option => !option.hidden) // Filter out hidden options
        .map(option => {
            const colorDotHtml = option.color ? `<span class="color-dot" style="background-color: ${option.color}; display: block;"></span>` : '';
            return `
            <div class="select-option" role="option" data-value="${option.value}" aria-selected="${option.value === value}">
              ${colorDotHtml}
              <span class="option-label">${option.label}</span>
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
        sel.querySelector('.select-trigger').setAttribute('aria-expanded', 'false');
        sel.querySelector('.select-options').style.display = 'none';
    });
  }
  document.addEventListener('click', closeAllSelects);


  // --- Initialize Custom Selects ---
  const bgPresetOptions = [
    { value: 'default', label: 'GPT-5 Wallpaper' },
    { value: 'blue', label: 'Blue Wallpaper' },
    { value: 'custom', label: 'Custom', hidden: true } // Hidden option for state
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, 'customBgUrl', (value) => {
    let newUrl = value === 'blue' ? BLUE_WALLPAPER_URL : '';
    if (value !== 'custom') {
        chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set({ customBgUrl: newUrl });
  });

  const bgScalingOptions = [
    { value: 'contain', label: 'Contain (fit)' },
    { value: 'cover', label: 'Cover (fill)' }
  ];
  const bgScalingSelect = createCustomSelect('bgScalingSelector', bgScalingOptions, 'backgroundScaling');

  const themeOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];
  const themeSelect = createCustomSelect('themeSelector', themeOptions, 'theme');

  const voiceColorOptions = [
    { value: 'default', label: 'Default (Blue)', color: '#8EBBFF' },
    { value: 'orange', label: 'Sunset Orange', color: '#FF9900' },
    { value: 'yellow', label: 'Solar Yellow', color: '#FFD700' },
    { value: 'pink', label: 'Sakura Pink', color: '#FF69B4' },
    { value: 'green', label: 'Aurora Green', color: '#32CD32' },
    { value: 'dark', label: 'Onyx Dark', color: '#555555' }
  ];
  const voiceColorSelect = createCustomSelect('voiceColorSelector', voiceColorOptions, 'voiceColor');


  // --- Function to update the UI based on current settings ---
  function updateUi(settings) {
    cbLegacy.checked = !!settings.legacyComposer;
    cbGpt5Limit.checked = !!settings.hideGpt5Limit;
    cbUpgradeButtons.checked = !!settings.hideUpgradeButtons;
    cbDisableAnimations.checked = !!settings.disableAnimations;
    cbFocusMode.checked = !!settings.focusMode;
    cbHideQuickSettings.checked = !!settings.hideQuickSettings;
    cbGptsButton.checked = !!settings.hideGptsButton;
    cbSoraButton.checked = !!settings.hideSoraButton;
    cbCuteVoice.checked = !!settings.cuteVoiceUI;
    cbShowInNewChatsOnly.checked = !!settings.showInNewChatsOnly;
    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;

    // Update custom selects
    bgScalingSelect.update(settings.backgroundScaling);
    themeSelect.update(settings.theme);
    voiceColorSelect.update(settings.voiceColor);

    // Special handling for background preset
    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;
    tbBgUrl.value = '';

    if (!url) {
      bgPresetSelect.update('default');
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPresetSelect.update('blue');
    } else if (url === '__local__') {
      bgPresetSelect.update('custom');
      tbBgUrl.value = 'Local file is in use';
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
      alert(`File is too large! Please choose a file under ${MAX_FILE_SIZE_MB}MB.`);
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