// popup.js — controls settings
const DEFAULTS = { showInChats: true, legacyComposer: false };

document.addEventListener('DOMContentLoaded', () => {
  const cbChats = document.getElementById('showInChats');
  const cbLegacy = document.getElementById('legacyComposer');

  chrome.storage.sync.get(DEFAULTS, (res) => {
    cbChats.checked  = !!res.showInChats;
    cbLegacy.checked = !!res.legacyComposer;
  });

  cbChats.addEventListener('change', () => {
    chrome.storage.sync.set({ showInChats: cbChats.checked });
  });

  cbLegacy.addEventListener('change', () => {
    chrome.storage.sync.set({ legacyComposer: cbLegacy.checked });
  });
});
