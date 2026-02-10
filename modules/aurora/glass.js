// modules/aurora/glass.js
// Tags dynamic ChatGPT UI nodes with `data-aurora-glass="true"` so CSS can apply a glass effect.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.glass = A.glass || {};

  const safeRequestIdleCallback = A.utils?.safeRequestIdleCallback || ((cb) => setTimeout(cb, 1));
  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);

  // Perf note: CSS :has() is expensive in querySelectorAll. Keep it out of the hot path.
  const GLASS_SELECTORS_SLOW = [
    'div[role="dialog"]:has(input#search[placeholder="Search GPTs"])',
    'div.bg-token-bg-primary.w-full.block:has(ul[class*="divide-y"])',
  ];

  const GLASS_SELECTORS_FAST = [
    /* Popups, Menus, Dialogs */
    '.popover.bg-token-main-surface-primary[data-radix-menu-content]',
    '.popover.bg-token-main-surface-primary[role="dialog"]',
    'div[role="dialog"][class*="shadow-long"]',
    '.popover.bg-token-main-surface-primary.max-w-xs',
    'div.sticky.top-14.bg-token-main-surface-primary',
    'textarea.bg-token-main-surface-primary.border-token-border-default',
    '.bg-token-main-surface-primary.sticky.top-\\[-1px\\]',
    /* Composer & Code Blocks */
    'form[data-type="unified-composer"] > div > div',
    'div[data-message-author-role="assistant"] pre',
    '.agent-turn pre',
    /* Buttons & UI Elements */
    '#cgpt-qs-panel',
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
    /* Toast Notifications */
    '[role="alert"]',
    '[role="status"]',
    /* Scroll to bottom button */
    '.absolute.z-30.h-8.w-8.rounded-full.bg-token-main-surface-primary',
    /* Voice Mode Buttons (Icon & Expanded Pill) */
    'button.h-9.w-9.rounded-full.bg-black',
    '.h-9.rounded-full.bg-token-bg-accent-static',
  ];

  const UNTAGGED_GLASS_SELECTOR_FAST = GLASS_SELECTORS_FAST.map((s) => `${s}:not([data-aurora-glass="true"])`).join(',');
  const UNTAGGED_GLASS_SELECTOR_ALL = GLASS_SELECTORS_SLOW.length
    ? [UNTAGGED_GLASS_SELECTOR_FAST, GLASS_SELECTORS_SLOW.map((s) => `${s}:not([data-aurora-glass="true"])`).join(',')]
        .filter(Boolean)
        .join(',')
    : UNTAGGED_GLASS_SELECTOR_FAST;

  function tag(root = document, includeSlowSelectors = false) {
    if (!isEnabled()) return;
    const selector = includeSlowSelectors ? UNTAGGED_GLASS_SELECTOR_ALL : UNTAGGED_GLASS_SELECTOR_FAST;

    // If root itself matches, tag it.
    if (root && root.nodeType === 1 && root.matches && root.matches(selector)) {
      root.dataset.auroraGlass = 'true';
    }

    const elements = root.querySelectorAll ? root.querySelectorAll(selector) : [];
    for (const el of elements) {
      el.dataset.auroraGlass = 'true';
    }
  }

  // Full document scan is throttled and scheduled in idle time to avoid jank.
  let glassFullScanCooldownUntil = 0;
  function scheduleFullScan() {
    if (!isEnabled()) return;
    const now = Date.now();
    if (now < glassFullScanCooldownUntil) return;
    glassFullScanCooldownUntil = now + 4000;
    safeRequestIdleCallback(() => tag(document, true), { timeout: 1000 });
  }

  // Slow-glass candidates (suggestion dropdowns, search dialogs).
  const GLASS_SLOW_HINTS_SELECTOR = 'ul[class*="divide-y"], input#search';
  function hasSlowHints(node) {
    if (!node || node.nodeType !== 1) return false;
    try {
      if (node.matches?.(GLASS_SLOW_HINTS_SELECTOR)) return true;
      const tagName = node.tagName;
      // Only scan typical container tags to avoid expensive queries during streaming output.
      if (!['DIV', 'SECTION', 'MAIN', 'FORM', 'NAV', 'ASIDE'].includes(tagName)) return false;
      const cls = node.getAttribute?.('class') || '';
      if (!cls || !/(bg-token|popover|shadow|rounded|w-full|block|divide)/.test(cls)) return false;
      return !!node.querySelector?.(GLASS_SLOW_HINTS_SELECTOR);
    } catch (e) {
      return false;
    }
  }

  function tagAncestorsForSlowHints(root) {
    if (!root || root.nodeType !== 1) return;
    try {
      // 1) Suggestion lists / dropdowns: tag wrapper immediately so glass applies without a full scan.
      const lists = [];
      if (root.matches?.('ul[class*="divide-y"]')) lists.push(root);
      root.querySelectorAll?.('ul[class*="divide-y"]').forEach((ul) => lists.push(ul));
      for (const ul of lists) {
        const container =
          ul.closest?.('div.bg-token-bg-primary.w-full.block') || ul.closest?.('div.bg-token-bg-primary') || ul.parentElement;
        if (container && container.nodeType === 1) container.dataset.auroraGlass = 'true';
      }

      // 2) Search dialogs: tag dialog/popover wrapper.
      const searches = [];
      if (root.matches?.('input#search')) searches.push(root);
      root.querySelectorAll?.('input#search').forEach((input) => searches.push(input));
      for (const input of searches) {
        const dialog = input.closest?.('div[role="dialog"]') || input.closest?.('.popover') || input.parentElement;
        if (dialog && dialog.nodeType === 1) dialog.dataset.auroraGlass = 'true';
      }
    } catch (e) {
      // ignore
    }
  }

  A.glass.tagFast = A.glass.tagFast || ((root = document) => tag(root, false));
  A.glass.tagAll = A.glass.tagAll || ((root = document) => tag(root, true));
  A.glass.scheduleFullScan = A.glass.scheduleFullScan || scheduleFullScan;
  A.glass.hasSlowHints = A.glass.hasSlowHints || hasSlowHints;
  A.glass.tagAncestorsForSlowHints = A.glass.tagAncestorsForSlowHints || tagAncestorsForSlowHints;
})();

