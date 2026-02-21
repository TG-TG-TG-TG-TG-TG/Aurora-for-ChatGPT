// content.js
// Intentionally small: boots Aurora's orchestrator.
// Feature implementations are split across `modules/aurora/*.js`.
(() => {
  'use strict';

  try {
    window.AuroraExt?.initAuroraContent?.();
  } catch (e) {
    // Ignore to avoid breaking the page if the extension context is invalidated.
  }
})();
