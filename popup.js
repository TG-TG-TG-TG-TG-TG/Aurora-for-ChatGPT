// popup.js — controls settings
const DEFAULTS = {
  showInChats: true,
  legacyComposer: false,
  theme: 'auto',
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
  focusMode: false, // New default for Focus Mode
  customBgUrl: '',
  backgroundBlur: '60',
  backgroundScaling: 'contain',
  hideGptsButton: false,
  hideSoraButton: false,
  voiceColor: 'default',
  cuteVoiceUI: false
};

const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

document.addEventListener('DOMContentLoaded', () => {
  // --- Get all UI elements ---
  const cbChats = document.getElementById('showInChats');
  const cbLegacy = document.getElementById('legacyComposer');
  const themeSelector = document.getElementById('themeSelector');
  const bgScalingSelector = document.getElementById('bgScalingSelector');
  const cbGpt5Limit = document.getElementById('hideGpt5Limit');
  const cbUpgradeButtons = document.getElementById('hideUpgradeButtons');
  const cbDisableAnimations = document.getElementById('disableAnimations');
  const cbFocusMode = document.getElementById('focusMode'); // New element
  const cbGptsButton = document.getElementById('hideGptsButton');
  const cbSoraButton = document.getElementById('hideSoraButton');
  const voiceColorSelector = document.getElementById('voiceColorSelector');
  const cbCuteVoice = document.getElementById('cuteVoiceUI');
  
  const bgPreset = document.getElementById('bgPreset');
  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');

  // --- Function to update the UI based on current settings ---
  function updateUi(settings) {
    cbChats.checked = !!settings.showInChats;
    cbLegacy.checked = !!settings.legacyComposer;
    themeSelector.value = settings.theme;
    bgScalingSelector.value = settings.backgroundScaling;
    cbGpt5Limit.checked = !!settings.hideGpt5Limit;
    cbUpgradeButtons.checked = !!settings.hideUpgradeButtons;
    cbDisableAnimations.checked = !!settings.disableAnimations;
    cbFocusMode.checked = !!settings.focusMode; // Update new UI element
    cbGptsButton.checked = !!settings.hideGptsButton;
    cbSoraButton.checked = !!settings.hideSoraButton;
    voiceColorSelector.value = settings.voiceColor;
    cbCuteVoice.checked = !!settings.cuteVoiceUI;
    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;

    if (!url) {
      bgPreset.value = 'default';
      tbBgUrl.value = '';
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPreset.value = 'blue';
      tbBgUrl.value = '';
    } else if (url === '__local__') {
      bgPreset.value = 'custom';
      tbBgUrl.value = 'Local file is in use';
      tbBgUrl.disabled = true;
    } else {
      bgPreset.value = 'custom';
      tbBgUrl.value = url;
    }
  }

  // --- Initial Load ---
  chrome.storage.sync.get(DEFAULTS, updateUi);

  // --- Event Listeners for Toggles ---
  cbChats.addEventListener('change', () => chrome.storage.sync.set({ showInChats: cbChats.checked }));
  cbLegacy.addEventListener('change', () => chrome.storage.sync.set({ legacyComposer: cbLegacy.checked }));
  themeSelector.addEventListener('change', () => chrome.storage.sync.set({ theme: themeSelector.value }));
  bgScalingSelector.addEventListener('change', () => chrome.storage.sync.set({ backgroundScaling: bgScalingSelector.value }));
  cbGpt5Limit.addEventListener('change', () => chrome.storage.sync.set({ hideGpt5Limit: cbGpt5Limit.checked }));
  cbUpgradeButtons.addEventListener('change', () => chrome.storage.sync.set({ hideUpgradeButtons: cbUpgradeButtons.checked }));
  cbDisableAnimations.addEventListener('change', () => chrome.storage.sync.set({ disableAnimations: cbDisableAnimations.checked }));
  cbFocusMode.addEventListener('change', () => chrome.storage.sync.set({ focusMode: cbFocusMode.checked })); // Save new setting
  cbGptsButton.addEventListener('change', () => chrome.storage.sync.set({ hideGptsButton: cbGptsButton.checked }));
  cbSoraButton.addEventListener('change', () => chrome.storage.sync.set({ hideSoraButton: cbSoraButton.checked }));
  voiceColorSelector.addEventListener('change', () => chrome.storage.sync.set({ voiceColor: voiceColorSelector.value }));
  cbCuteVoice.addEventListener('change', () => chrome.storage.sync.set({ cuteVoiceUI: cbCuteVoice.checked }));

  // --- Event Listeners for Custom Background ---
  blurSlider.addEventListener('input', () => {
    blurValue.textContent = blurSlider.value;
  });
  blurSlider.addEventListener('change', () => {
    chrome.storage.sync.set({ backgroundBlur: blurSlider.value });
  });

  bgPreset.addEventListener('change', () => {
    let newUrl = bgPreset.value === 'blue' ? BLUE_WALLPAPER_URL : '';
    chrome.storage.sync.set({ customBgUrl: newUrl });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });
  tbBgUrl.addEventListener('change', () => {
    chrome.storage.sync.set({ customBgUrl: tbBgUrl.value.trim() });
    chrome.storage.local.remove(LOCAL_BG_KEY);
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
      backgroundBlur: DEFAULTS.backgroundBlur
    });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });
  chrome.storage.onChanged.addListener(() => chrome.storage.sync.get(DEFAULTS, updateUi));
});