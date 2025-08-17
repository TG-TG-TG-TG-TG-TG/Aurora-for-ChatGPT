// popup.js — controls settings
const DEFAULTS = { showInChats: true, legacyComposer: false, lightMode: false };

document.addEventListener('DOMContentLoaded', () => {
  const cbChats = document.getElementById('showInChats');
  const cbLegacy = document.getElementById('legacyComposer');
  const cbLight = document.getElementById('lightMode');

  chrome.storage.sync.get(DEFAULTS, (res) => {
    cbChats.checked  = !!res.showInChats;
    cbLegacy.checked = !!res.legacyComposer;
    cbLight.checked  = !!res.lightMode;
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
});
