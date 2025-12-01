// background.js - Single Source of Truth for settings

const DEFAULTS = {
  legacyComposer: false,
  theme: 'auto',
  appearance: 'clear',
  hideGpt5Limit: false,
  hideUpgradeButtons: false,
  disableAnimations: false,
  focusMode: false,
  hideQuickSettings: false,
  customBgUrl: '',
  backgroundBlur: '60',
  backgroundScaling: 'cover',
  voiceColor: 'default',
  cuteVoiceUI: false,
  hasSeenWelcomeScreen: false,
  defaultModel: '',
  customFont: 'system',
  showTokenCounter: false,
  blurChatHistory: false,
  blurAvatar: false,
  // --- New Features ---
  soundEnabled: false,
  soundVolume: 'low', // low, medium, high
  autoContrast: false,
  smartSelectors: true
};

chrome.runtime.onInstalled.addListener((details) => {
  // --- NEW LOGIC ---
  if (details.reason === 'install') {
    // This is a fresh installation.
    // Set the defaults directly, ignoring anything that might be in storage.
    chrome.storage.sync.set(DEFAULTS, () => {
      console.log('Aurora Extension: First install, defaults set.');
    });
  } else if (details.reason === 'update') {
    // This is an update.
    // Merge existing settings with any new defaults that have been added.
    chrome.storage.sync.get((items) => {
      // Find keys in DEFAULTS that are not in items
      const newSettings = {};
      Object.keys(DEFAULTS).forEach((key) => {
        if (items[key] === undefined) {
          newSettings[key] = DEFAULTS[key];
        }
      });
      
      if (Object.keys(newSettings).length > 0) {
        chrome.storage.sync.set(newSettings, () => {
          console.log('Aurora Extension: Updated settings merged.', newSettings);
        });
      }
    });
  }
});

// Listen for requests from other parts of the extension (popup, content script).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    // Retrieve settings, applying defaults for any that are missing.
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      sendResponse(settings);
    });
    // Return true to indicate that the response will be sent asynchronously.
    return true;
  }
  if (request.type === 'GET_DEFAULTS') {
    sendResponse(DEFAULTS);
    return true;
  }
});