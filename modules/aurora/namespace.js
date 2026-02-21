// modules/aurora/namespace.js
// Shared namespace for Aurora content-script modules (non-ESM).
(() => {
  'use strict';

  try {
    const A = (window.AuroraExt = window.AuroraExt || {});
    A.cache = A.cache || {};
    A.cache.ui = A.cache.ui || {};

    A.state = A.state || {};
    A.state.settings = A.state.settings || {};

    A.getSettings = A.getSettings || (() => A.state.settings);
    A.isEnabled = A.isEnabled || (() => A.getSettings().extensionEnabled !== false);
  } catch (e) {
    // ignore
  }
})();

