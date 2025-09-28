// background.js - Single Source of Truth for settings

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

// On install or update, ensure all settings have a value.
// This is crucial for adding new settings in future updates.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    chrome.storage.sync.set(settings);
  });
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
});