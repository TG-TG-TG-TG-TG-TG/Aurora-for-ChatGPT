// popup.js — controls settings
const DEFAULTS = {
  showInChats: true,
  legacyComposer: false,
  lightMode: false,
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
  customBgUrl: '' // Empty string signifies the default "GPT-5" wallpaper
};

const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';

document.addEventListener('DOMContentLoaded', () => {
  // --- Get all UI elements ---
  const cbChats = document.getElementById('showInChats');
  const cbLegacy = document.getElementById('legacyComposer');
  const cbLight = document.getElementById('lightMode');
  const cbGpt5Limit = document.getElementById('hideGpt5Limit');
  const cbUpgradeButtons = document.getElementById('hideUpgradeButtons');
  const cbDisableAnimations = document.getElementById('disableAnimations');
  
  const bgPreset = document.getElementById('bgPreset');
  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');

  // --- Function to update the UI based on current settings ---
  function updateUi(settings) {
    cbChats.checked = !!settings.showInChats;
    cbLegacy.checked = !!settings.legacyComposer;
    cbLight.checked = !!settings.lightMode;
    cbGpt5Limit.checked = !!settings.hideGpt5Limit;
    cbUpgradeButtons.checked = !!settings.hideUpgradeButtons;
    cbDisableAnimations.checked = !!settings.disableAnimations;

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false; // Enable by default

    if (!url) { // Default GPT-5 Wallpaper
      bgPreset.value = 'default';
      tbBgUrl.value = '';
    } else if (url === BLUE_WALLPAPER_URL) { // Blue Wallpaper
      bgPreset.value = 'blue';
      tbBgUrl.value = ''; // Hide the URL, but keep input enabled
    } else if (url === '__local__') { // Local file
      bgPreset.value = 'custom';
      tbBgUrl.value = 'Local image is in use';
      tbBgUrl.disabled = true; // Disable only for local files
    } else { // Custom URL
      bgPreset.value = 'custom';
      tbBgUrl.value = url;
    }
  }

  // --- Initial Load ---
  chrome.storage.sync.get(DEFAULTS, updateUi);

  // --- Event Listeners for Toggles ---
  cbChats.addEventListener('change', () => chrome.storage.sync.set({ showInChats: cbChats.checked }));
  cbLegacy.addEventListener('change', () => chrome.storage.sync.set({ legacyComposer: cbLegacy.checked }));
  cbLight.addEventListener('change', () => chrome.storage.sync.set({ lightMode: cbLight.checked }));
  cbGpt5Limit.addEventListener('change', () => chrome.storage.sync.set({ hideGpt5Limit: cbGpt5Limit.checked }));
  cbUpgradeButtons.addEventListener('change', () => chrome.storage.sync.set({ hideUpgradeButtons: cbUpgradeButtons.checked }));
  cbDisableAnimations.addEventListener('change', () => chrome.storage.sync.set({ disableAnimations: cbDisableAnimations.checked }));

  // --- Event Listeners for Custom Background ---

  // Handle preset selection
  bgPreset.addEventListener('change', () => {
    const selection = bgPreset.value;
    let newUrl = '';
    if (selection === 'blue') {
      newUrl = BLUE_WALLPAPER_URL;
    }
    // For 'default', newUrl remains '', which is correct.
    chrome.storage.sync.set({ customBgUrl: newUrl });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  // Handle URL input
  tbBgUrl.addEventListener('change', () => {
    const url = tbBgUrl.value.trim();
    chrome.storage.sync.set({ customBgUrl: url });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  // Handle file upload
  fileBg.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (dataUrl.length > 4.5 * 1024 * 1024) {
        alert('Image is too large! Please choose a file under 4MB.');
        fileBg.value = ''; return;
      }
      chrome.storage.local.set({ [LOCAL_BG_KEY]: dataUrl }, () => {
        chrome.storage.sync.set({ customBgUrl: '__local__' });
      });
    };
    reader.readAsDataURL(file);
    fileBg.value = '';
  });

  // Handle the reset button (resets to default GPT-5 wallpaper)
  btnClearBg.addEventListener('click', () => {
    chrome.storage.sync.set({ customBgUrl: '' });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  // Listen for changes from other parts of the extension and update UI
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      chrome.storage.sync.get(DEFAULTS, updateUi);
    }
  });
});