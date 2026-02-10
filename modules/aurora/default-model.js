// modules/aurora/default-model.js
// Apply a user-selected default model in ChatGPT's model switcher UI.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.defaultModel = A.defaultModel || {};

  const cfg = A.config || {};
  const MODEL_LABEL_HINTS = cfg.MODEL_LABEL_HINTS || {};
  const LEGACY_MODEL_SLUGS = cfg.LEGACY_MODEL_SLUGS || new Set();

  const normalizeToken = A.utils?.normalizeToken || ((v) => (v || '').toLowerCase().replace(/\s+/g, ' ').trim());
  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  let lastDefaultModelApplied = null;
  let modelApplyCooldownUntil = 0;
  let defaultModelApplyPromise = null;
  let applyingDefaultModel = false;

  function modelTextMatches(text, slug) {
    const normalizedText = normalizeToken(text);
    if (!slug) return false;
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    return hints.some((hint) => normalizedText.includes(normalizeToken(hint)));
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    return !!rect && rect.width > 0 && rect.height > 0;
  }

  function findModelMenu(button) {
    const ariaControls = button?.getAttribute?.('aria-controls');
    if (ariaControls) {
      const controlled = document.getElementById(ariaControls);
      if (controlled && isElementVisible(controlled)) return controlled;
    }
    const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isElementVisible);
    return menus[menus.length - 1] || null;
  }

  function findMenuOption(menu, slug) {
    const hints = MODEL_LABEL_HINTS[slug] || [slug.replace(/-/g, ' ')];
    const normalizedHints = hints.map(normalizeToken).filter(Boolean);
    const candidates = Array.from(menu.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button')).filter(
      (el) => isElementVisible(el) && el.closest?.('[role="menu"]') === menu
    );

    for (const el of candidates) {
      const text = el.getAttribute('aria-label') || el.textContent || '';
      const normalizedText = normalizeToken(text);
      if (!normalizedText) continue;

      // Avoid mismatching "Thinking Mini" when selecting "Thinking".
      if (slug === 'gpt-5-thinking' && normalizedText.includes('mini')) continue;

      const exactMatch = normalizedHints.find((hint) => normalizedText === hint);
      if (exactMatch) return el;

      const prefixMatch = normalizedHints.find((hint) => normalizedText.startsWith(`${hint} `));
      if (prefixMatch) return el;

      const suffixMatch = normalizedHints.find((hint) => normalizedText.endsWith(` ${hint}`));
      if (suffixMatch) return el;

      const containsMatch = normalizedHints.find((hint) => normalizedText.includes(hint));
      if (containsMatch) return el;
    }

    return null;
  }

  function waitFor(getter, timeout = 1200) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const value = typeof getter === 'function' ? getter() : document.querySelector(getter);
        if (value) return resolve(value);
        if (performance.now() - start >= timeout) return resolve(null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function openLegacyMenuIfNeeded(currentMenu) {
    const legacyTrigger = Array.from(currentMenu.querySelectorAll('[role="menuitem"], button')).find(
      (el) => isElementVisible(el) && normalizeToken(el.textContent || '').includes('legacy models')
    );
    if (!legacyTrigger) return currentMenu;

    const pointerInit = { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    try {
      legacyTrigger.dispatchEvent(new PointerEvent('pointerover', pointerInit));
    } catch (e) {}
    try {
      legacyTrigger.dispatchEvent(new PointerEvent('pointerenter', pointerInit));
    } catch (e) {}
    legacyTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    legacyTrigger.focus();
    legacyTrigger.click();

    const submenu = await waitFor(() => {
      const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isElementVisible);
      return menus.length > 1 ? menus[menus.length - 1] : null;
    }, 800);

    return submenu || currentMenu;
  }

  async function applyDefaultModelOnce(slug) {
    const button = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    if (!button) return false;

    const currentLabel = button.getAttribute('aria-label') || button.textContent || '';
    if (modelTextMatches(currentLabel, slug)) {
      lastDefaultModelApplied = slug;
      return true;
    }

    applyingDefaultModel = true;
    try {
      if (button.getAttribute('aria-expanded') !== 'true') button.click();

      let menu = await waitFor(() => findModelMenu(button), 1200);
      if (!menu) return false;

      if (LEGACY_MODEL_SLUGS.has(slug)) {
        const legacyMenu = await openLegacyMenuIfNeeded(menu);
        if (legacyMenu) menu = legacyMenu;
      }

      const option = findMenuOption(menu, slug);
      if (!option) return false;

      option.click();
      lastDefaultModelApplied = slug;
      return true;
    } finally {
      applyingDefaultModel = false;
      requestAnimationFrame(() => {
        if (button.getAttribute('aria-expanded') === 'true') button.click();
      });
    }
  }

  function maybeApply(force = false) {
    if (!isEnabled()) return;

    const s = getSettings();
    const slug = String(s.defaultModel || '').trim();
    if (!slug) {
      lastDefaultModelApplied = null;
      modelApplyCooldownUntil = 0;
      return;
    }

    if (!force && Date.now() < modelApplyCooldownUntil) return;
    if (applyingDefaultModel || defaultModelApplyPromise) return;

    const attempt = async (remaining) => {
      const success = await applyDefaultModelOnce(slug);
      if (success) {
        modelApplyCooldownUntil = Date.now() + 1500;
        return true;
      }
      if (remaining <= 0) {
        modelApplyCooldownUntil = Date.now() + 6000;
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      return attempt(remaining - 1);
    };

    defaultModelApplyPromise = attempt(2).finally(() => {
      defaultModelApplyPromise = null;
    });
  }

  A.defaultModel.maybeApply = A.defaultModel.maybeApply || maybeApply;
})();
