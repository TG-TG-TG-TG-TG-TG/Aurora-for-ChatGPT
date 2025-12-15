/**
 * Aurora for ChatGPT - Constants
 * Centralized storage for all extension constants
 */

// Initialize global namespace
window.Aurora = window.Aurora || {};

// ============================================================================
// URL Constants
// ============================================================================
window.Aurora.URLS = {
    BLUE_WALLPAPER: 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80',
    get GROK_HORIZON() {
        try {
            if (chrome?.runtime?.getURL) {
                return chrome.runtime.getURL('Aurora/grok-4.webp');
            }
        } catch (e) {
            // Chrome API not available yet
        }
        return 'Aurora/grok-4.webp';
    },
    DEFAULT_WEBP_SRCSET: 'https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w',
    DEFAULT_IMG_SRC: 'https://persistent.oaistatic.com/burrito-nux/640.webp'
};

// ============================================================================
// Storage Keys
// ============================================================================
window.Aurora.STORAGE_KEYS = {
    LOCAL_BG: 'customBgData',
    GPT5_LIMIT_TIMESTAMP: 'gpt5LimitHitTimestamp',
    DETECTED_THEME: 'detectedTheme'
};

// ============================================================================
// CSS Classes
// ============================================================================
window.Aurora.CSS_CLASSES = {
    AMBIENT_ON: 'cgpt-ambient-on',
    LEGACY_COMPOSER: 'cgpt-legacy-composer',
    LIGHT_MODE: 'cgpt-light-mode',
    ANIMATIONS_DISABLED: 'cgpt-animations-disabled',
    APPEARANCE_CLEAR: 'cgpt-appearance-clear',
    HIDE_LIMIT: 'cgpt-hide-gpt5-limit',
    HIDE_UPGRADE: 'cgpt-hide-upgrade',
    FOCUS_MODE: 'cgpt-focus-mode-on',
    CUTE_VOICE: 'cgpt-cute-voice-on',
    BLUR_CHAT_HISTORY: 'cgpt-blur-chat-history',
    BLUR_AVATAR: 'cgpt-blur-avatar',
    TAB_HIDDEN: 'cgpt-tab-hidden',
    SNAPSHOT_MODE: 'cgpt-snapshot-mode',
    THEME_TRANSITIONING: 'cgpt-theme-transitioning',
    SNOWFALL_ON: 'aurora-snowfall-on',
    NEW_YEAR_ON: 'aurora-new-year-on'
};

// ============================================================================
// Element IDs
// ============================================================================
window.Aurora.ELEMENT_IDS = {
    BACKGROUND: 'cgpt-ambient-bg',
    STYLES: 'cgpt-ambient-styles',
    QS_BUTTON: 'cgpt-qs-btn',
    QS_PANEL: 'cgpt-qs-panel',
    TOKEN_COUNTER: 'aurora-token-counter',
    WELCOME_OVERLAY: 'aurora-welcome-overlay',
    GARLAND_CONTAINER: 'aurora-garland-container',
    SNOW_CONTAINER: 'aurora-snow-container'
};

// ============================================================================
// DOM Selectors
// ============================================================================
window.Aurora.SELECTORS = {
    GPT5_LIMIT_POPUP: 'div[class*="text-token-text-primary"]',
    UPGRADE_MENU_ITEM: 'a.__menu-item',
    UPGRADE_TOP_BUTTON: '.start-1\\/2.absolute',
    UPGRADE_PROFILE_BUTTON: '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn',
    UPGRADE_SIDEBAR_BUTTON: 'div.gap-1\\.5.__menu-item.group',
    UPGRADE_TINY_SIDEBAR: '#stage-sidebar-tiny-bar > div:nth-of-type(4)',
    UPGRADE_SETTINGS_ROW: 'div.py-2.border-b',
    UPGRADE_BOTTOM_BANNER: 'div[role="button"]',
    PROFILE_BUTTON: '[data-testid="accounts-profile-button"]',
    MODEL_SWITCHER: '[data-testid="model-switcher-dropdown-button"]',
    PROMPT_TEXTAREA: '#prompt-textarea',
    UNIFIED_COMPOSER: 'form[data-type="unified-composer"]'
};

// ============================================================================
// Model Configuration
// ============================================================================
window.Aurora.MODEL_CONFIG = {
    LABEL_HINTS: {
        'gpt-5': ['auto', 'gpt-5'],
        'gpt-5-thinking': ['gpt-5 thinking', 'thinking'],
        'gpt-5-thinking-mini': ['thinking mini', 'mini'],
        'gpt-5-thinking-instant': ['instant'],
        'gpt-4o': ['gpt-4o', '4o'],
        'gpt-4.1': ['gpt-4.1', 'gpt 4.1'],
        'o3': ['o3'],
        'o4-mini': ['o4 mini', 'o4-mini']
    },
    LEGACY_SLUGS: new Set(['gpt-4o', 'gpt-4.1', 'o3', 'o4-mini']),
    TOKEN_LIMITS: {
        'gpt-5': 400000,
        'gpt-5-mini': 400000,
        'gpt-5.1': 400000,
        'gpt-5-thinking': 400000,
        'gpt-5-thinking-mini': 400000,
        'gpt-5-thinking-instant': 400000,
        'gpt-4o': 128000,
        'gpt-4o-mini': 128000,
        'gpt-4.1': 1000000,
        'gpt-4.1-mini': 1000000,
        'o3': 200000,
        'o3-mini': 200000,
        'o4-mini': 200000,
        'o1': 200000,
        'o1-mini': 128000,
        'gpt-4': 8192,
        'gpt-3.5-turbo': 16385,
        'default': 128000
    }
};

// ============================================================================
// Default Settings
// ============================================================================
window.Aurora.DEFAULTS = {
    legacyComposer: false,
    theme: 'auto',
    appearance: 'clear',
    hideGpt5Limit: false,
    hideUpgradeButtons: false,
    disableAnimations: false,
    focusMode: false,
    hideQuickSettings: false,
    customBgUrl: '',
    backgroundBlur: '60',
    backgroundScaling: 'cover',
    voiceColor: 'default',
    cuteVoiceUI: false,
    hasSeenWelcomeScreen: false,
    defaultModel: '',
    customFont: 'system',
    showTokenCounter: false,
    blurChatHistory: false,
    blurAvatar: false,
    soundEnabled: false,
    soundVolume: 'low',
    autoContrast: false,
    smartSelectors: true,
    dataMaskingEnabled: false,
    maskingRandomMode: false,
    enableSnowfall: false,
    enableNewYear: false
};

// ============================================================================
// Glass Effect Selectors
// ============================================================================
window.Aurora.GLASS_SELECTORS = [
    '.popover.bg-token-main-surface-primary[data-radix-menu-content]',
    '.popover.bg-token-main-surface-primary[role="dialog"]',
    'div[role="dialog"][class*="shadow-long"]',
    '.popover.bg-token-main-surface-primary.max-w-xs',
    'div.sticky.top-14.bg-token-main-surface-primary',
    'div[role="dialog"]:has(input#search[placeholder="Search GPTs"])',
    'textarea.bg-token-main-surface-primary.border-token-border-default',
    '.bg-token-main-surface-primary.sticky.top-\\[-1px\\]',
    'form[data-type="unified-composer"] > div > div',
    'div[data-message-author-role="assistant"] pre',
    '.agent-turn pre',
    '#cgpt-qs-panel',
    'div.bg-token-bg-primary.w-full.block:has(ul.divide-y)',
    '.py-3.px-3.rounded-3xl.bg-token-main-surface-tertiary',
    '.divide-token-border-default.bg-token-main-surface-primary.mx-1.mt-1',
    'button[aria-label="Scroll down"]',
    '.active\\:opacity-1.border-none.rounded-xl.flex.shadow-long.btn-secondary.relative.btn',
    '.shrink-0.btn-secondary.relative.btn',
    '.shrink-0.btn-danger-outline.relative.btn',
    '.justify-between.items-center.flex > .btn-small.btn-secondary.relative.btn',
    '.hover\\:cursor-pointer.cursor-default.me-0.my-0.btn-small.btn.btn-secondary',
    '.p-4.rounded-lg.justify-stretch.items-center.flex-col.w-full.flex.relative.bg-token-main-surface-primary',
    '.p-4.rounded-xl.my-4.bg-token-bg-tertiary.text-token-text-secondary',
    '.p-3.border.rounded-\\[10px\\].w-full.btn-secondary',
    '[role="tooltip"]',
    '[role="alert"]',
    '[role="status"]',
    '.absolute.z-30.h-8.w-8.rounded-full.bg-token-main-surface-primary',
    'button.h-9.w-9.rounded-full.bg-black',
    '.h-9.rounded-full.bg-token-bg-accent-static'
];

// ============================================================================
// Timeouts and Intervals
// ============================================================================
window.Aurora.TIMING = {
    FIVE_MINUTES_MS: 5 * 60 * 1000,
    DEBOUNCE_DEFAULT: 150,
    TRANSITION_DURATION: 800,
    MODEL_APPLY_COOLDOWN: 1500,
    MODEL_APPLY_FAIL_COOLDOWN: 6000
};
