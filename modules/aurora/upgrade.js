// modules/aurora/upgrade.js
// Hiding GPT-5 limit popup and Upgrade UI.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.upgrade = A.upgrade || {};

  const cfg = A.config || {};
  const SELECTORS = cfg.SELECTORS || {};

  const HIDE_LIMIT_CLASS = cfg.HIDE_LIMIT_CLASS || 'cgpt-hide-gpt5-limit';
  const HIDE_UPGRADE_CLASS = cfg.HIDE_UPGRADE_CLASS || 'cgpt-hide-upgrade';
  const TIMESTAMP_KEY = cfg.TIMESTAMP_KEY || 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = cfg.FIVE_MINUTES_MS || 5 * 60 * 1000;

  const getCachedElement = A.utils?.getCachedElement || ((_, fn) => fn());
  const toggleClassForElements =
    A.utils?.toggleClassForElements ||
    ((elements, className, force) => {
      elements.forEach((el) => {
        if (el) el.classList.toggle(className, force);
      });
    });

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  let cachedLimitTimestamp = null;
  let hasCheckedTimestamp = false;
  let isTimestampCleared = false;

  function applyLimitPopup() {
    if (!isEnabled()) return;

    const s = getSettings();
    const popup = document.querySelector(SELECTORS.GPT5_LIMIT_POPUP || 'div[class*="text-token-text-primary"]');
    const isLimitMsg = popup && (popup.textContent || '').toLowerCase().includes("you've reached the gpt-5 limit");

    // If popup exists but it's not the limit message, ignore it.
    if (popup && !isLimitMsg) return;

    // If feature is disabled, just ensure it's visible.
    if (!s.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_LIMIT_CLASS);
      return;
    }

    if (!chrome?.runtime?.id) return;

    if (popup) {
      // Popup IS present.
      isTimestampCleared = false; // Reset cleared flag so we clean up later when it disappears.

      // If we already have a cached timestamp, use it.
      if (cachedLimitTimestamp) {
        if (Date.now() - cachedLimitTimestamp > FIVE_MINUTES_MS) {
          popup.classList.add(HIDE_LIMIT_CLASS);
        }
        return;
      }

      // If we haven't checked storage yet, check it once.
      if (!hasCheckedTimestamp) {
        hasCheckedTimestamp = true; // Prevent spamming GET.
        chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
          if (chrome.runtime.lastError) {
            hasCheckedTimestamp = false; // Retry next time.
            return;
          }
          if (result[TIMESTAMP_KEY]) {
            cachedLimitTimestamp = result[TIMESTAMP_KEY];
            if (Date.now() - cachedLimitTimestamp > FIVE_MINUTES_MS) {
              popup.classList.add(HIDE_LIMIT_CLASS);
            }
          } else {
            // No timestamp exists, set one.
            const now = Date.now();
            cachedLimitTimestamp = now;
            chrome.storage.local.set({ [TIMESTAMP_KEY]: now });
          }
        });
      }
    } else {
      // Popup is NOT present.
      if (!isTimestampCleared) {
        isTimestampCleared = true;
        cachedLimitTimestamp = null;
        hasCheckedTimestamp = false; // Reset so we fetch again next time it appears.

        chrome.storage.local.remove([TIMESTAMP_KEY], () => {
          // ignore errors to avoid loops
        });
      }
    }
  }

  function applyUpgradeButtons() {
    if (!isEnabled()) return;

    const s = getSettings();
    if (!s.hideUpgradeButtons) {
      const hiddenElements = document.getElementsByClassName(HIDE_UPGRADE_CLASS);
      if (hiddenElements.length > 0) {
        Array.from(hiddenElements).forEach((el) => el.classList.remove(HIDE_UPGRADE_CLASS));
      }
      return;
    }

    const upgradeElements = [
      getCachedElement('upgradePanelButton', () =>
        Array.from(document.querySelectorAll(SELECTORS.UPGRADE_MENU_ITEM || 'a.__menu-item')).find((el) =>
          (el.textContent || '').toLowerCase().includes('upgrade')
        )
      ),
      getCachedElement('upgradeTopButtonContainer', () =>
        document.querySelector(SELECTORS.UPGRADE_TOP_BUTTON_CONTAINER || '.start-1\\/2.absolute')
      ),
      getCachedElement('upgradeProfileButton', () =>
        document.querySelector(
          SELECTORS.UPGRADE_PROFILE_BUTTON_TRAILING_ICON ||
            '[data-testid="accounts-profile-button"] .__menu-item-trailing-btn'
        )
      ),
      getCachedElement('upgradeNewSidebarButton', () =>
        Array.from(document.querySelectorAll(SELECTORS.UPGRADE_SIDEBAR_BUTTON || 'div.gap-1\\.5.__menu-item.group')).find(
          (el) => (el.textContent || '').toLowerCase().includes('upgrade')
        )
      ),
      getCachedElement('upgradeTinySidebarIcon', () =>
        document.querySelector(SELECTORS.UPGRADE_TINY_SIDEBAR_ICON || '#stage-sidebar-tiny-bar > div:nth-of-type(4)')
      ),
      getCachedElement('upgradeBottomBanner', () => {
        const banner = Array.from(document.querySelectorAll(SELECTORS.UPGRADE_BOTTOM_BANNER || 'div[role="button"]')).find(
          (el) => (el.textContent || '').toLowerCase().includes('upgrade your plan')
        );
        return banner ? banner.parentElement : null;
      }),
      getCachedElement('upgradeAccountSection', () => {
        const allSettingRows = document.querySelectorAll(SELECTORS.UPGRADE_SETTINGS_ROW_CONTAINER || 'div.py-2.border-b');
        for (const row of allSettingRows) {
          const rowText = row.textContent || '';
          const hasUpgradeTitle = rowText.includes('Get ChatGPT Plus') || rowText.includes('Get ChatGPT Go');
          const hasUpgradeButton = Array.from(row.querySelectorAll('button')).some((btn) => btn.textContent.trim() === 'Upgrade');
          if (hasUpgradeTitle && hasUpgradeButton) return row;
        }
        return null;
      }),
      getCachedElement('upgradeGoHeaderButton', () => document.querySelector('.rounded-full.dark\\:bg-\\[\\#373669\\]')),
      getCachedElement('upgradeToGoRobust', () => {
        const allCandidates = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
        const textMatch = allCandidates.find((el) => (el.textContent || '').includes('Upgrade to Go'));
        return textMatch ? textMatch.closest('.rounded-full') || textMatch : null;
      }),
    ];

    toggleClassForElements(upgradeElements.filter(Boolean), HIDE_UPGRADE_CLASS, true);
  }

  A.upgrade.applyLimitPopup = A.upgrade.applyLimitPopup || applyLimitPopup;
  A.upgrade.applyUpgradeButtons = A.upgrade.applyUpgradeButtons || applyUpgradeButtons;
})();

