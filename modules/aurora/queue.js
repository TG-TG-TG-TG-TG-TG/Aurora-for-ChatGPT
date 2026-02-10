// modules/aurora/queue.js
// Wrapper for modules/message-queue.js (delayed/queued messages while generating).
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.queue = A.queue || {};

  const getSettings = () => (A.getSettings ? A.getSettings() : {});
  const isExtensionEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getMessage = A.i18n?.getMessage || ((k) => k);

  let engine = null;

  function ensureEngine() {
    if (engine) return engine;
    if (!window.AuroraMessageQueueEngine) return null;
    const s = getSettings();
    if (!isExtensionEnabled() || !s.queueWhileGenerating) return null;
    engine = new window.AuroraMessageQueueEngine({ getSettings, isExtensionEnabled, getMessage });
    return engine;
  }

  function isEnabled() {
    const s = getSettings();
    return isExtensionEnabled() && !!s.queueWhileGenerating;
  }

  function hasWork() {
    return !!(engine && engine.hasWork && engine.hasWork());
  }

  function pulse() {
    const e = ensureEngine();
    if (e) e.pulse();
  }

  function schedulePulse(delay = 0) {
    const e = ensureEngine();
    if (e) e.schedulePulse(delay);
  }

  function shutdown() {
    if (engine) engine.shutdown();
  }

  A.queue.isEnabled = A.queue.isEnabled || isEnabled;
  A.queue.hasWork = A.queue.hasWork || hasWork;
  A.queue.pulse = A.queue.pulse || pulse;
  A.queue.schedulePulse = A.queue.schedulePulse || schedulePulse;
  A.queue.shutdown = A.queue.shutdown || shutdown;
})();

