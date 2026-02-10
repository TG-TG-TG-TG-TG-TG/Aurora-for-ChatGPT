// modules/aurora-app.js
// Legacy entrypoint stub.
// The implementation was split into smaller modules under `modules/aurora/*.js`
// and is loaded via `manifest.json`.
(() => {
  'use strict';

  // Keep namespace present for older code paths/tools that may look for it.
  try {
    window.AuroraExt = window.AuroraExt || {};
  } catch (e) {
    // ignore
  }
})();

