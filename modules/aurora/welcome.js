// modules/aurora/welcome.js
// Welcome / onboarding overlay shown once per install.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.welcome = A.welcome || {};

  const cfg = A.config || {};
  const BLUE_WALLPAPER_URL = cfg.BLUE_WALLPAPER_URL || '';
  const GROK_HORIZON_URL = cfg.GROK_HORIZON_URL || '';
  const CHRISTMAS_BG_URL = cfg.CHRISTMAS_BG_URL || '';
  const QS_BUTTON_ID = cfg.QS_BUTTON_ID || 'cgpt-qs-btn';

  const getMessage = A.i18n?.getMessage || ((k) => k);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  function getWelcomeScreenHTML() {
    const logoUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL('icons/logo-48.png') : '';
    return `
      <div id="aurora-welcome-overlay">
        <div class="welcome-container">
          <div id="screen-1" class="screen active">
            <div class="content-panel">
              <img src="${logoUrl}" alt="Aurora" class="aurora-logo-img">
              <h1>${getMessage('welcomeTitle')}</h1>
              <p>${getMessage('welcomeDescription')}</p>
              <div class="progress-dots">
                <span class="dot active"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <button id="get-started-btn" class="welcome-btn primary">${getMessage('welcomeBtnGetStarted')}</button>
            </div>
          </div>
        </div>

        <div id="aurora-style-bar" class="aurora-setup-bar">
          <div class="setup-section holiday-section">
            <div class="holiday-mode-toggle">
              <span class="holiday-emoji">🎄</span>
              <span class="holiday-label">${getMessage('labelHolidayMode')}</span>
              <label class="switch">
                <input type="checkbox" id="welcome-holiday-mode">
                <span class="track"><span class="thumb"></span></span>
              </label>
            </div>
          </div>

          <div class="setup-divider"></div>

          <div class="setup-section">
            <label class="section-label">${getMessage('welcomeLabelBgPreset')}</label>
            <div class="preset-grid">
              <button class="preset-tile" data-bg-url="default">
                <div class="preview default"></div>
                <span>${getMessage('welcomePresetDefault')}</span>
              </button>
              <button class="preset-tile" data-bg-url="__gpt5_animated__">
                <div class="preview animated"></div>
                <span>${getMessage('welcomePresetAnimated')}</span>
              </button>
              <button class="preset-tile christmas-tile" data-bg-url="christmas">
                <div class="preview christmas"></div>
                <span>🎄 Christmas</span>
              </button>
              <button class="preset-tile" data-bg-url="grokHorizon">
                <div class="preview grok"></div>
                <span>${getMessage('welcomePresetHorizon')}</span>
              </button>
            </div>
          </div>

          <div class="setup-section">
            <label class="section-label">${getMessage('welcomeLabelGlassStyle')}</label>
            <div class="aurora-glass-switch" id="welcome-glass-switch" data-switch-state="0">
              <div class="aurora-switch-glider"></div>
              <button type="button" class="aurora-switch-btn" data-value="0" data-appearance="clear">${getMessage(
                'welcomeGlassClear'
              )}</button>
              <button type="button" class="aurora-switch-btn" data-value="1" data-appearance="dimmed">${getMessage(
                'welcomeGlassDimmed'
              )}</button>
            </div>
          </div>

          <div class="progress-dots bar-dots">
            <span class="dot"></span>
            <span class="dot active"></span>
            <span class="dot"></span>
          </div>

          <button id="next-to-support-btn" class="welcome-btn primary finish-button">${getMessage('welcomeBtnNext')}</button>
        </div>

        <div id="aurora-support-screen" class="support-screen">
          <div class="support-card">
            <div class="support-header">
              <span class="support-icon">💖</span>
              <h2>${getMessage('welcomeSupportTitle')}</h2>
            </div>
            <p class="support-description">${getMessage('welcomeSupportDescription')}</p>

            <div class="support-buttons">
              <a href="https://ko-fi.com/testtm" target="_blank" rel="noopener" class="support-btn donate-btn">
                <span class="btn-icon">☕</span>
                <span>${getMessage('welcomeSupportDonate')}</span>
              </a>
              <a href="https://github.com/AuroraForChatGPT/Aurora-for-ChatGPT" target="_blank" rel="noopener" class="support-btn github-btn">
                <span class="btn-icon">⭐</span>
                <span>${getMessage('welcomeSupportStar')}</span>
              </a>
            </div>

            <div class="progress-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot active"></span>
            </div>

            <button id="finish-btn" class="welcome-btn primary">${getMessage('welcomeBtnFinish')}</button>
            <button id="skip-support-btn" class="welcome-btn-link">${getMessage('welcomeBtnSkip')}</button>
          </div>
        </div>

        <div id="aurora-success-overlay" class="success-overlay">
          <div class="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none"/>
              <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  function show(applyAllSettings) {
    if (!document.body) return;
    if (document.getElementById('aurora-welcome-overlay')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = getWelcomeScreenHTML();
    if (wrapper.firstElementChild) document.body.appendChild(wrapper.firstElementChild);

    const settings = getSettings();
    let tempSettings = { ...settings };

    const getStartedBtn = document.getElementById('get-started-btn');
    const nextToSupportBtn = document.getElementById('next-to-support-btn');
    const finishBtn = document.getElementById('finish-btn');
    const skipSupportBtn = document.getElementById('skip-support-btn');
    const welcomeOverlay = document.getElementById('aurora-welcome-overlay');
    const welcomeContainer = document.querySelector('.welcome-container');
    const styleBar = document.getElementById('aurora-style-bar');
    const supportScreen = document.getElementById('aurora-support-screen');

    const finishWelcome = () => {
      tempSettings.hasSeenWelcomeScreen = true;
      chrome.storage.sync.set(tempSettings, () => {
        if (chrome.runtime.lastError) return;

        const successOverlay = document.getElementById('aurora-success-overlay');
        if (successOverlay) {
          successOverlay.classList.add('active');
          setTimeout(() => {
            welcomeOverlay?.remove();
            // Add sparkle hint to Quick Settings button for new users.
            setTimeout(() => {
              const qsBtn = document.getElementById(QS_BUTTON_ID);
              if (!qsBtn) return;
              qsBtn.classList.add('sparkle-hint');
              qsBtn.addEventListener(
                'click',
                () => {
                  qsBtn.classList.remove('sparkle-hint');
                },
                { once: true }
              );
            }, 500);
          }, 1200);
        } else {
          welcomeOverlay?.remove();
        }
      });
    };

    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', () => {
        welcomeOverlay?.classList.add('setup-active');

        if (welcomeContainer) {
          welcomeContainer.classList.add('exiting');
          setTimeout(() => styleBar?.classList.add('active'), 150);
          setTimeout(() => {
            welcomeContainer.style.display = 'none';
          }, 500);
        } else {
          styleBar?.classList.add('active');
        }

        const defaultTile = document.querySelector('#aurora-style-bar .preset-tile[data-bg-url="default"]');
        defaultTile?.classList.add('active');
      });
    }

    if (nextToSupportBtn) {
      nextToSupportBtn.addEventListener('click', () => {
        if (styleBar) {
          styleBar.classList.remove('active');
          styleBar.classList.add('exiting');
        }
        setTimeout(() => supportScreen?.classList.add('active'), 200);
      });
    }

    skipSupportBtn?.addEventListener('click', finishWelcome);
    finishBtn?.addEventListener('click', finishWelcome);

    document.querySelectorAll('#aurora-style-bar .preset-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        document.querySelectorAll('#aurora-style-bar .preset-tile').forEach((t) => t.classList.remove('active'));
        tile.classList.add('active');
        const bgChoice = tile.dataset.bgUrl;
        let newUrl = '';

        if (bgChoice === 'blue') newUrl = BLUE_WALLPAPER_URL;
        else if (bgChoice === 'grokHorizon') newUrl = GROK_HORIZON_URL;
        else if (bgChoice === 'christmas') newUrl = CHRISTMAS_BG_URL;
        else if (bgChoice === '__gpt5_animated__') newUrl = '__gpt5_animated__';

        tempSettings.customBgUrl = newUrl;
        settings.customBgUrl = newUrl;
        if (typeof applyAllSettings === 'function') applyAllSettings();

        // If Christmas preset selected, auto-check Holiday Mode toggle.
        const holidayToggle = document.getElementById('welcome-holiday-mode');
        if (holidayToggle && bgChoice === 'christmas') {
          holidayToggle.checked = true;
          tempSettings.enableSnowfall = true;
          tempSettings.enableNewYear = true;
          settings.enableSnowfall = true;
          settings.enableNewYear = true;
          if (typeof applyAllSettings === 'function') applyAllSettings();
        }
      });
    });

    const welcomeHolidayMode = document.getElementById('welcome-holiday-mode');
    if (welcomeHolidayMode) {
      welcomeHolidayMode.addEventListener('change', () => {
        const isOn = welcomeHolidayMode.checked;
        tempSettings.enableSnowfall = isOn;
        tempSettings.enableNewYear = isOn;
        settings.enableSnowfall = isOn;
        settings.enableNewYear = isOn;

        if (isOn) {
          tempSettings.customBgUrl = CHRISTMAS_BG_URL;
          settings.customBgUrl = CHRISTMAS_BG_URL;
          document.querySelectorAll('#aurora-style-bar .preset-tile').forEach((t) => t.classList.remove('active'));
          const christmasTile = document.querySelector('#aurora-style-bar .preset-tile[data-bg-url="christmas"]');
          christmasTile?.classList.add('active');
        }

        if (typeof applyAllSettings === 'function') applyAllSettings();
      });
    }

    const glassSwitch = document.getElementById('welcome-glass-switch');
    if (glassSwitch) {
      glassSwitch.querySelectorAll('.aurora-switch-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const value = btn.dataset.value;
          const appearanceChoice = btn.dataset.appearance;
          glassSwitch.setAttribute('data-switch-state', value);
          tempSettings.appearance = appearanceChoice;
          settings.appearance = appearanceChoice;
          if (typeof applyAllSettings === 'function') applyAllSettings();
        });
      });
    }
  }

  A.welcome.show = A.welcome.show || show;
})();

