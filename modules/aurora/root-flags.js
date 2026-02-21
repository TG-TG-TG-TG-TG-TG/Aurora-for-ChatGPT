// modules/aurora/root-flags.js
// Applies <html> flags, attributes and derived settings.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.rootFlags = A.rootFlags || {};

  const cfg = A.config || {};
  const HTML_CLASS = cfg.HTML_CLASS || 'cgpt-ambient-on';
  const LEGACY_CLASS = cfg.LEGACY_CLASS || 'cgpt-legacy-composer';
  const LIGHT_CLASS = cfg.LIGHT_CLASS || 'cgpt-light-mode';
  const ANIMATIONS_DISABLED_CLASS = cfg.ANIMATIONS_DISABLED_CLASS || 'cgpt-animations-disabled';
  const CLEAR_APPEARANCE_CLASS = cfg.CLEAR_APPEARANCE_CLASS || 'cgpt-appearance-clear';

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  // Perf: avoid spamming storage.local with repeated detectedTheme writes.
  let lastDetectedTheme = null;
  let lastDetectedThemeWriteAt = 0;

  function apply() {
    if (!isEnabled()) return;

    const s = getSettings();
    const root = document.documentElement;

    root.classList.toggle(HTML_CLASS, true);
    root.classList.toggle(LEGACY_CLASS, !!s.legacyComposer);
    root.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!s.disableAnimations);
    root.classList.toggle(CLEAR_APPEARANCE_CLASS, s.appearance === 'clear');
    root.classList.toggle('cgpt-cute-voice-on', !!s.cuteVoiceUI);
    root.classList.toggle('cgpt-focus-mode-on', !!s.focusMode);
    root.classList.toggle('cgpt-cinema-mode', !!s.cinemaMode);

    // Streamer mode (blur).
    root.classList.toggle('cgpt-blur-chat-history', !!s.blurChatHistory);
    root.classList.toggle('cgpt-blur-avatar', !!s.blurAvatar);

    // Custom font support.
    const customFont = s.customFont || 'system';
    root.setAttribute('data-custom-font', customFont);
    A.fonts?.ensure?.(customFont);

    const applyLightMode = s.theme === 'light' || (s.theme === 'auto' && root.classList.contains('light'));
    root.classList.toggle(LIGHT_CLASS, applyLightMode);

    // Store detected theme (used by popup for correct default), throttled.
    try {
      if (chrome?.runtime?.id && chrome?.storage?.local) {
        const detectedTheme = applyLightMode ? 'light' : 'dark';
        const now = Date.now();
        if (detectedTheme !== lastDetectedTheme && now - lastDetectedThemeWriteAt > 500) {
          lastDetectedTheme = detectedTheme;
          lastDetectedThemeWriteAt = now;
          chrome.storage.local.set({ detectedTheme }, () => {
            // ignore errors (extension context invalidated etc.)
          });
        }
      }
    } catch (e) {
      // ignore
    }

    root.setAttribute('data-voice-color', s.voiceColor || 'default');
  }

  A.rootFlags.apply = A.rootFlags.apply || apply;
})();

