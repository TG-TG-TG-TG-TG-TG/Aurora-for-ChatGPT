// modules/aurora/quick-settings.js
// Quick Settings floating button + panel UI.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.quickSettings = A.quickSettings || {};

  const cfg = A.config || {};
  const QS_BUTTON_ID = cfg.QS_BUTTON_ID || 'cgpt-qs-btn';
  const QS_PANEL_ID = cfg.QS_PANEL_ID || 'cgpt-qs-panel';
  const CHRISTMAS_BG_URL = cfg.CHRISTMAS_BG_URL || '';
  const GROK_HORIZON_URL = cfg.GROK_HORIZON_URL || '';
  const BLUE_WALLPAPER_URL = cfg.BLUE_WALLPAPER_URL || '';

  const getMessage = A.i18n?.getMessage || ((k) => k);
  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  let qsInitScheduled = false;
  let themeTimer = null;

  function setupQuickSettingsVoiceSelector(settings) {
    const voiceColorOptions = [
      { value: 'default', labelKey: 'voiceColorOptionDefault', color: '#8EBBFF' },
      { value: 'orange', labelKey: 'voiceColorOptionOrange', color: '#FF9900' },
      { value: 'yellow', labelKey: 'voiceColorOptionYellow', color: '#FFD700' },
      { value: 'pink', labelKey: 'voiceColorOptionPink', color: '#FF69B4' },
      { value: 'green', labelKey: 'voiceColorOptionGreen', color: '#32CD32' },
      { value: 'dark', labelKey: 'voiceColorOptionDark', color: '#555555' },
    ];

    const selectContainer = document.getElementById('qs-voice-color-select');
    if (!selectContainer) return;

    const trigger = selectContainer.querySelector('.qs-select-trigger');
    const optionsContainer = selectContainer.querySelector('.qs-select-options');
    if (!trigger || !optionsContainer) return;

    const triggerDot = trigger.querySelector('.qs-color-dot');
    const triggerLabel = trigger.querySelector('.qs-select-label');

    const resolveVoiceLabel = (option) => getMessage(option.labelKey);

    const renderVoiceOptions = (selectedValue) => {
      optionsContainer.innerHTML = voiceColorOptions
        .map(
          (option) => `
        <div class="qs-select-option" role="option" data-value="${option.value}" aria-selected="${option.value === selectedValue}">
          <span class="qs-color-dot" style="background-color: ${option.color};"></span>
          <span class="qs-select-label">${resolveVoiceLabel(option)}</span>
          <svg class="qs-checkmark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `
        )
        .join('');

      optionsContainer.querySelectorAll('.qs-select-option').forEach((optionEl) => {
        optionEl.addEventListener('click', () => {
          const newValue = optionEl.dataset.value;
          chrome.storage.sync.set({ voiceColor: newValue });
          trigger.setAttribute('aria-expanded', 'false');
          optionsContainer.style.display = 'none';
        });
      });
    };

    const updateSelectorState = (value) => {
      const selectedOption = voiceColorOptions.find((opt) => opt.value === value) || voiceColorOptions[0];
      if (triggerDot) triggerDot.style.backgroundColor = selectedOption.color;
      if (triggerLabel) triggerLabel.textContent = resolveVoiceLabel(selectedOption);
      renderVoiceOptions(value);
    };

    updateSelectorState(settings.voiceColor);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      optionsContainer.style.display = expanded ? 'none' : 'block';
    });
  }

  function ensure() {
    if (!isEnabled()) return;
    if (!document.body) {
      if (!qsInitScheduled) {
        qsInitScheduled = true;
        document.addEventListener(
          'DOMContentLoaded',
          () => {
            qsInitScheduled = false;
            ensure();
          },
          { once: true }
        );
      }
      return;
    }

    const settings = getSettings();

    let btn = document.getElementById(QS_BUTTON_ID);
    let panel = document.getElementById(QS_PANEL_ID);

    if (!btn) {
      btn = document.createElement('button');
      btn.id = QS_BUTTON_ID;
      btn.title = getMessage('quickSettingsButtonTitle');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.65 19.5 12.33 19.5 12S19.47 11.35 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.35 4.5 11.67 4.5 12S4.53 12.65 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.04 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"></path></svg>`;
      document.body.appendChild(btn);

      panel = document.createElement('div');
      panel.id = QS_PANEL_ID;
      document.body.appendChild(panel);

      panel.setAttribute('data-state', 'closed');
      const openPanel = () => panel.setAttribute('data-state', 'open');
      const closePanel = () => panel.setAttribute('data-state', 'closing');

      panel.addEventListener('animationend', (e) => {
        if (e.animationName === 'qs-panel-close' && panel.getAttribute('data-state') === 'closing') {
          panel.setAttribute('data-state', 'closed');
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const state = panel.getAttribute('data-state');
        if (state === 'closed') openPanel();
        else if (state === 'open') closePanel();
      });

      document.addEventListener('click', (e) => {
        if (panel && !panel.contains(e.target) && panel.getAttribute('data-state') === 'open') {
          closePanel();
        }
        const selectContainer = document.getElementById('qs-voice-color-select');
        if (selectContainer && !selectContainer.contains(e.target)) {
          const selectTrigger = selectContainer.querySelector('.qs-select-trigger');
          if (selectTrigger && selectTrigger.getAttribute('aria-expanded') === 'true') {
            const selectOptions = selectContainer.querySelector('.qs-select-options');
            selectTrigger.setAttribute('aria-expanded', 'false');
            if (selectOptions) selectOptions.style.display = 'none';
          }
        }
      });
    }

    panel.innerHTML = `
      <div class="qs-section-title">${getMessage('quickSettingsSectionVisibility')}</div>
      <div class="qs-row" data-setting="focusMode">
        <label>${getMessage('labelFocusMode')}</label>
        <label class="switch"><input type="checkbox" id="qs-focusMode"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="hideUpgradeButtons">
        <label>${getMessage('quickSettingsLabelHideUpgradeButtons')}</label>
        <label class="switch"><input type="checkbox" id="qs-hideUpgradeButtons"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="blurChatHistory">
        <label>${getMessage('quickSettingsLabelStreamerMode')}</label>
        <label class="switch"><input type="checkbox" id="qs-blurChatHistory"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-section-title">${getMessage('sectionHolidayEffects')}</div>
      <div class="qs-row qs-holiday-mode" data-setting="holidayMode">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🎄</span>
          <label>${getMessage('labelHolidayMode')}</label>
        </div>
        <label class="switch"><input type="checkbox" id="qs-holidayMode"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="enableSnowfall">
        <div style="display: flex; align-items: center; gap: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>
          <label>${getMessage('labelSnowfall')}</label>
        </div>
        <label class="switch"><input type="checkbox" id="qs-enableSnowfall"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="enableNewYear">
        <label>${getMessage('labelNewYear')}</label>
        <label class="switch"><input type="checkbox" id="qs-enableNewYear"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-section-title">${getMessage('tabBehavior')}</div>
      <div class="qs-row" data-setting="queueWhileGenerating">
        <label>${getMessage('labelQueueWhileGenerating')}</label>
        <label class="switch"><input type="checkbox" id="qs-queueWhileGenerating"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-section-title">${getMessage('sectionAppearance')}</div>
      <div class="qs-row" data-setting="appearance">
        <label>${getMessage('quickSettingsLabelGlassStyle')}</label>
        <div class="aurora-glass-switch" id="qs-appearance-toggle" data-switch-state="${settings.appearance === 'dimmed' ? '1' : '0'}">
          <div class="aurora-switch-glider"></div>
          <button type="button" class="aurora-switch-btn" data-value="0" data-setting-value="clear">${getMessage('glassAppearanceOptionClear')}</button>
          <button type="button" class="aurora-switch-btn" data-value="1" data-setting-value="dimmed">${getMessage('glassAppearanceOptionDimmed')}</button>
        </div>
      </div>
    `;

    const qsToggles = [
      'focusMode',
      'hideUpgradeButtons',
      'cuteVoiceUI',
      'blurChatHistory',
      'enableSnowfall',
      'enableNewYear',
      'queueWhileGenerating',
    ];
    qsToggles.forEach((key) => {
      const checkbox = document.getElementById(`qs-${key}`);
      if (!checkbox) return;
      checkbox.checked = !!settings[key];
      checkbox.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: checkbox.checked });
      });
    });

    // Holiday Mode toggle (combines snowfall + garland + Christmas background)
    const qsHolidayMode = document.getElementById('qs-holidayMode');
    if (qsHolidayMode) {
      const isHolidayMode = !!settings.enableSnowfall && !!settings.enableNewYear && settings.customBgUrl === CHRISTMAS_BG_URL;
      qsHolidayMode.checked = isHolidayMode;

      qsHolidayMode.addEventListener('change', () => {
        const isOn = qsHolidayMode.checked;
        chrome.storage.sync.set({
          enableSnowfall: isOn,
          enableNewYear: isOn,
          customBgUrl: isOn ? CHRISTMAS_BG_URL : '',
        });
        // Also update individual toggles visually.
        const snowToggle = document.getElementById('qs-enableSnowfall');
        const yearToggle = document.getElementById('qs-enableNewYear');
        if (snowToggle) snowToggle.checked = isOn;
        if (yearToggle) yearToggle.checked = isOn;
      });
    }

    setupQuickSettingsVoiceSelector(settings);

    // Sync Appearance Segmented Control
    const appearanceToggle = document.getElementById('qs-appearance-toggle');
    if (appearanceToggle) {
      const currentAppearance = settings.appearance || 'clear';
      appearanceToggle.setAttribute('data-switch-state', currentAppearance === 'dimmed' ? '1' : '0');

      const segmentBtns = appearanceToggle.querySelectorAll('.aurora-switch-btn');
      segmentBtns.forEach((btnEl) => {
        btnEl.addEventListener('click', () => {
          const settingValue = btnEl.dataset.settingValue;
          const switchState = btnEl.dataset.value;

          document.documentElement.classList.add('cgpt-theme-transitioning');
          if (themeTimer) clearTimeout(themeTimer);
          themeTimer = setTimeout(() => {
            document.documentElement.classList.remove('cgpt-theme-transitioning');
            themeTimer = null;
          }, 600);

          chrome.storage.sync.set({ appearance: settingValue });
          appearanceToggle.setAttribute('data-switch-state', switchState);
        });
      });
    }
  }

  function remove() {
    document.getElementById(QS_BUTTON_ID)?.remove();
    document.getElementById(QS_PANEL_ID)?.remove();
  }

  A.quickSettings.ensure = A.quickSettings.ensure || ensure;
  A.quickSettings.remove = A.quickSettings.remove || remove;
})();

