// modules/aurora/init.js
// Single public entrypoint invoked by content.js.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  let instance = null;

  A.initAuroraContent =
    A.initAuroraContent ||
    (() => {
      if (instance) return instance;
      const Orchestrator = A.orchestrator?.AuroraOrchestrator;
      if (!Orchestrator) return null;
      instance = new Orchestrator();
      instance.init();
      return instance;
    });
})();

