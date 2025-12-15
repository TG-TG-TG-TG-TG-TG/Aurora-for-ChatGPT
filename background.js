/**
 * Aurora for ChatGPT - Background Service Worker
 * Settings management and message handling
 */

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
  soundEnabled: false,
  soundVolume: 'low',
  autoContrast: false,
  smartSelectors: true,
  dataMaskingEnabled: false,
  maskingRandomMode: false,
  enableSnowfall: false,
  enableNewYear: false
};

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DEFAULTS);
  } else if (details.reason === 'update') {
    chrome.storage.sync.get((items) => {
      const newSettings = {};
      Object.keys(DEFAULTS).forEach((key) => {
        if (items[key] === undefined) {
          newSettings[key] = DEFAULTS[key];
        }
      });
      if (Object.keys(newSettings).length > 0) {
        chrome.storage.sync.set(newSettings);
      }
    });
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_SETTINGS':
      chrome.storage.sync.get(Object.keys(DEFAULTS), (items) => {
        if (chrome.runtime.lastError) {
          console.error('Aurora: Failed to get settings:', chrome.runtime.lastError);
          sendResponse(DEFAULTS);
          return;
        }
        const settings = { ...DEFAULTS, ...items };
        sendResponse(settings);
      });
      return true;

    case 'GET_DEFAULTS':
      sendResponse(DEFAULTS);
      return true;

    case 'RESET_ALL':
      chrome.storage.sync.set(DEFAULTS, () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      return false;
  }
});