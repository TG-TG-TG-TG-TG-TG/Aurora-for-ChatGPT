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
  maskingRandomMode: false
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      sendResponse(settings);
    });
    return true;
  }
  if (request.type === 'GET_DEFAULTS') {
    sendResponse(DEFAULTS);
    return true;
  }
});