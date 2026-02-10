// modules/aurora/masking.js
// Data masking integration (engine lives in data-masking.js).
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.masking = A.masking || {};

  let initPromise = null;

  function applyInitial() {
    if (!window.DataMaskingEngine?.init) return;
    if (!initPromise) {
      initPromise = Promise.resolve()
        .then(() => window.DataMaskingEngine.init())
        .catch(() => {});
    }
  }

  // Kept for backward compatibility; DataMaskingEngine already observes the DOM itself.
  function processNewNodes(_nodes) {}

  function stop() {
    try {
      window.DataMaskingEngine?.stopObserver?.();
    } catch (e) {
      // ignore
    }
  }

  A.masking.applyInitial = A.masking.applyInitial || applyInitial;
  A.masking.processNewNodes = A.masking.processNewNodes || processNewNodes;
  A.masking.stop = A.masking.stop || stop;
})();

