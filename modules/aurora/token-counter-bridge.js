// modules/aurora/token-counter-bridge.js
// Bridge to token-counter.js (do not modify token-counter.js itself).
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.tokenCounter = A.tokenCounter || {};

  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  function apply() {
    if (window.AuroraTokenCounter?.manage) {
      const s = getSettings();
      window.AuroraTokenCounter.manage(!!s.showTokenCounter);
    }
  }

  function disable() {
    if (window.AuroraTokenCounter?.manage) {
      window.AuroraTokenCounter.manage(false);
    }
  }

  A.tokenCounter.apply = A.tokenCounter.apply || apply;
  A.tokenCounter.disable = A.tokenCounter.disable || disable;
})();

