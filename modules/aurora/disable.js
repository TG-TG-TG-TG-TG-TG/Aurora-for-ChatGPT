// modules/aurora/disable.js
// Cleanup helpers when the extension is disabled.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.disable = A.disable || {};

  const cfg = A.config || {};

  const ID = cfg.ID || 'cgpt-ambient-bg';
  const HTML_CLASS = cfg.HTML_CLASS || 'cgpt-ambient-on';
  const LEGACY_CLASS = cfg.LEGACY_CLASS || 'cgpt-legacy-composer';
  const LIGHT_CLASS = cfg.LIGHT_CLASS || 'cgpt-light-mode';
  const ANIMATIONS_DISABLED_CLASS = cfg.ANIMATIONS_DISABLED_CLASS || 'cgpt-animations-disabled';
  const CLEAR_APPEARANCE_CLASS = cfg.CLEAR_APPEARANCE_CLASS || 'cgpt-appearance-clear';
  const QS_BUTTON_ID = cfg.QS_BUTTON_ID || 'cgpt-qs-btn';
  const QS_PANEL_ID = cfg.QS_PANEL_ID || 'cgpt-qs-panel';
  const HIDE_LIMIT_CLASS = cfg.HIDE_LIMIT_CLASS || 'cgpt-hide-gpt5-limit';
  const HIDE_UPGRADE_CLASS = cfg.HIDE_UPGRADE_CLASS || 'cgpt-hide-upgrade';

  function disableAllFeatures() {
    const root = document.documentElement;

    root.classList.remove(
      HTML_CLASS,
      LEGACY_CLASS,
      ANIMATIONS_DISABLED_CLASS,
      CLEAR_APPEARANCE_CLASS,
      LIGHT_CLASS,
      'cgpt-cute-voice-on',
      'cgpt-focus-mode-on',
      'cgpt-cinema-mode',
      'cgpt-blur-chat-history',
      'cgpt-blur-avatar',
      'cgpt-snow-on',
      'cgpt-snow-logo',
      'cgpt-theme-transitioning',
      'cgpt-tab-hidden',
      'cgpt-snapshot-mode'
    );

    root.removeAttribute('data-custom-font');
    root.removeAttribute('data-voice-color');
    root.style.removeProperty('--cgpt-bg-blur-radius');
    root.style.removeProperty('--cgpt-object-fit');
    root.style.removeProperty('--aurora-santa-hat-image');
    root.style.removeProperty('--aurora-snowdrift-left-image');
    root.style.removeProperty('--aurora-snowdrift-right-image');
    root.style.removeProperty('--aurora-snow-image');
    root.style.removeProperty('--bg-opacity');

    // Optional engines / UI.
    A.fonts?.cleanup?.();
    A.audio?.detach?.();

    const bgNode = document.getElementById(ID);
    bgNode?.remove();

    try {
      if (A.background?.reset) A.background.reset();
      else if (A.background?.manager) {
        A.background.manager.abort?.();
        A.background.manager.currentUrl = null;
        A.background.manager.activeLayerId = 'a';
        A.background.manager.state = 'idle';
        A.background.manager.pendingUrl = null;
      }
    } catch (e) {
      // ignore
    }

    document.getElementById(QS_BUTTON_ID)?.remove();
    document.getElementById(QS_PANEL_ID)?.remove();

    document.getElementById('aurora-snow-container')?.remove();
    document.getElementById('aurora-garland-container')?.remove();

    document.getElementById('aurora-welcome-overlay')?.remove();
    document.getElementById('aurora-success-overlay')?.remove();
    document.getElementById('aurora-style-bar')?.remove();
    document.getElementById('aurora-support-screen')?.remove();

    document.querySelectorAll(`.${HIDE_LIMIT_CLASS}`).forEach((el) => el.classList.remove(HIDE_LIMIT_CLASS));
    document.querySelectorAll(`.${HIDE_UPGRADE_CLASS}`).forEach((el) => el.classList.remove(HIDE_UPGRADE_CLASS));

    // Token counter (bridge only).
    A.tokenCounter?.disable?.();

    // Data masking engine.
    A.masking?.stop?.();
  }

  A.disable.all = A.disable.all || disableAllFeatures;
})();

