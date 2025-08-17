// popup.js — controls settings
const DEFAULTS = { showInChats: true, legacyComposer: false, lightMode: false, hideGpt5Limit: false };

document.addEventListener('DOMContentLoaded', () => {
  const cbChats = document.getElementById('showInChats');
  const cbLegacy = document.getElementById('legacyComposer');
  const cbLight = document.getElementById('lightMode');
  const cbGpt5Limit = document.getElementById('hideGpt5Limit');

  chrome.storage.sync.get(DEFAULTS, (res) => {
    cbChats.checked  = !!res.showInChats;
    cbLegacy.checked = !!res.legacyComposer;
    cbLight.checked  = !!res.lightMode;
    cbGpt5Limit.checked = !!res.hideGpt5Limit;
  });

  cbChats.addEventListener('change', () => {
    chrome.storage.sync.set({ showInChats: cbChats.checked });
  });

  cbLegacy.addEventListener('change', () => {
    chrome.storage.sync.set({ legacyComposer: cbLegacy.checked });
  });

  cbLight.addEventListener('change', () => {
    chrome.storage.sync.set({ lightMode: cbLight.checked });
  });

  cbGpt5Limit.addEventListener('change', () => {
    chrome.storage.sync.set({ hideGpt5Limit: cbGpt5Limit.checked });
  });
});