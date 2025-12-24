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
  enableNewYear: false,
  cinemaMode: false,
  snowType: 'standard'
};

// --- Settings Cache for Instant Popup Response ---
let settingsCache = null;
let localCache = {};

// Pre-cache settings on service worker startup
chrome.storage.sync.get(DEFAULTS, (settings) => {
  settingsCache = { ...DEFAULTS, ...settings };
});
chrome.storage.local.get(['customBgData', 'detectedTheme'], (local) => {
  localCache = local || {};
});

// Keep cache in sync with any storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && settingsCache) {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (newValue !== undefined) {
        settingsCache[key] = newValue;
      } else {
        settingsCache[key] = DEFAULTS[key];
      }
    }
  }
  if (area === 'local') {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (newValue !== undefined) {
        localCache[key] = newValue;
      } else {
        delete localCache[key];
      }
    }
  }
});

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
  // GET_SETTINGS: Returns just settings object (for content.js compatibility)
  if (request.type === 'GET_SETTINGS') {
    if (settingsCache) {
      sendResponse(settingsCache);
      return false; // Synchronous response
    } else {
      // Fallback: cache not ready yet (rare edge case)
      chrome.storage.sync.get(DEFAULTS, (settings) => {
        settingsCache = { ...DEFAULTS, ...settings };
        sendResponse(settingsCache);
      });
      return true; // Async response
    }
  }

  // GET_SETTINGS_FULL: Returns settings + local data (for popup.js instant open)
  if (request.type === 'GET_SETTINGS_FULL') {
    if (settingsCache) {
      sendResponse({ settings: settingsCache, local: localCache });
      return false; // Synchronous response
    } else {
      // Fallback: cache not ready yet (rare edge case)
      Promise.all([
        chrome.storage.sync.get(DEFAULTS),
        chrome.storage.local.get(['customBgData', 'detectedTheme'])
      ]).then(([sync, local]) => {
        settingsCache = { ...DEFAULTS, ...sync };
        localCache = local || {};
        sendResponse({ settings: settingsCache, local: localCache });
      });
      return true; // Async response
    }
  }

  if (request.type === 'GET_DEFAULTS') {
    sendResponse(DEFAULTS);
    return false;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-visibility') {
    chrome.storage.sync.get('focusMode', (items) => {
      // Toggle Focus Mode
      chrome.storage.sync.set({ focusMode: !items.focusMode });
    });
  } else if (command === 'toggle-blur') {
    chrome.storage.sync.get('blurChatHistory', (items) => {
      // Toggle Streamer Mode (Blur)
      chrome.storage.sync.set({ blurChatHistory: !items.blurChatHistory });
    });
  }
});