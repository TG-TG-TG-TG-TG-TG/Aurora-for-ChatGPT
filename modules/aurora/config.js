// modules/aurora/config.js
// Constants/config shared by Aurora modules.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});

  function runtimeUrl(path) {
    try {
      if (chrome?.runtime?.getURL) return chrome.runtime.getURL(path);
    } catch (e) {
      // ignore
    }
    return path;
  }

  A.config = A.config || {
    // DOM IDs
    ID: 'cgpt-ambient-bg',
    STYLE_ID: 'cgpt-ambient-styles',
    QS_BUTTON_ID: 'cgpt-qs-btn',
    QS_PANEL_ID: 'cgpt-qs-panel',

    // <html> classes
    HTML_CLASS: 'cgpt-ambient-on',
    LEGACY_CLASS: 'cgpt-legacy-composer',
    LIGHT_CLASS: 'cgpt-light-mode',
    ANIMATIONS_DISABLED_CLASS: 'cgpt-animations-disabled',
    CLEAR_APPEARANCE_CLASS: 'cgpt-appearance-clear',

    // Storage / misc
    LOCAL_BG_KEY: 'customBgData',
    HIDE_LIMIT_CLASS: 'cgpt-hide-gpt5-limit',
    HIDE_UPGRADE_CLASS: 'cgpt-hide-upgrade',
    TIMESTAMP_KEY: 'gpt5LimitHitTimestamp',
    FIVE_MINUTES_MS: 5 * 60 * 1000,

    // Preset URLs / assets
    BLUE_WALLPAPER_URL:
      'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80',
    GROK_HORIZON_URL: runtimeUrl('Aurora/grok-4.webp'),
    SANTA_HAT_URL: runtimeUrl('santa_hat_cutout_v2.png'),
    CHRISTMAS_BG_URL: runtimeUrl('Aurora/christmas-bg.webp'),
    SNOWDRIFT_LEFT_URL: runtimeUrl('Left.png'),
    SNOWDRIFT_RIGHT_URL: runtimeUrl('Right.png'),
    CHATGPT_LOGO_URL: runtimeUrl('ChatGPT-Logo.svg.png'),

    // Selectors
    SELECTORS: {
      GPT5_LIMIT_POPUP: 'div[class*="text-token-text-primary"]',
      UPGRADE_MENU_ITEM: 'a.__menu-item',
      UPGRADE_TOP_BUTTON_CONTAINER: '.start-1\\/2.absolute',
      UPGRADE_PROFILE_BUTTON_TRAILING_ICON: '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn',
      UPGRADE_SIDEBAR_BUTTON: 'div.gap-1\\.5.__menu-item.group',
      UPGRADE_TINY_SIDEBAR_ICON: '#stage-sidebar-tiny-bar > div:nth-of-type(4)',
      UPGRADE_SETTINGS_ROW_CONTAINER: 'div.py-2.border-b',
      UPGRADE_BOTTOM_BANNER: 'div[role="button"]',
      PROFILE_BUTTON: '[data-testid="accounts-profile-button"]',
    },

    // Default model selection hints (robust to UI text variations)
    MODEL_LABEL_HINTS: {
      'gpt-5': ['auto', 'gpt-5'],
      'gpt-5-thinking': ['gpt-5 thinking', 'thinking'],
      'gpt-5-thinking-mini': ['thinking mini', 'mini'],
      'gpt-5-thinking-instant': ['instant'],
      'gpt-4o': ['gpt-4o', '4o'],
      'gpt-4.1': ['gpt-4.1', 'gpt 4.1'],
      o3: ['o3'],
      'o4-mini': ['o4 mini', 'o4-mini'],
      o1: ['o1'],
      'o1-mini': ['o1 mini', 'o1-mini'],
    },
  };

  A.config.LEGACY_MODEL_SLUGS =
    A.config.LEGACY_MODEL_SLUGS || new Set(['gpt-4o', 'gpt-4.1', 'o3', 'o4-mini', 'o1', 'o1-mini']);
})();

