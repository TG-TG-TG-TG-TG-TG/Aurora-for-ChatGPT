// modules/aurora/i18n.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.i18n = A.i18n || {};

  A.i18n.getMessage =
    A.i18n.getMessage ||
    ((key, substitutions) => {
      try {
        if (window.AuroraI18n?.getMessage) {
          const text = window.AuroraI18n.getMessage(key, substitutions);
          if (text && text !== key) return text;
        }
        if (chrome?.i18n?.getMessage && chrome?.runtime?.id) {
          const text = chrome.i18n.getMessage(key, substitutions);
          if (text) return text;
        }
      } catch (e) {
        // Suppress extension context errors
      }
      return key;
    });

  A.i18n.initialize =
    A.i18n.initialize ||
    (async () => {
      try {
        if (window.AuroraI18n?.initialize) {
          await window.AuroraI18n.initialize();
          return window.AuroraI18n.getDetectedLocale?.() || null;
        }
      } catch (e) {
        // ignore
      }
      return null;
    });
})();

