// modules/aurora/holiday.js
// Snow + garland effects and related CSS variables.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.holiday = A.holiday || {};

  const cfg = A.config || {};
  const SANTA_HAT_URL = cfg.SANTA_HAT_URL || '';
  const SNOWDRIFT_LEFT_URL = cfg.SNOWDRIFT_LEFT_URL || '';
  const SNOWDRIFT_RIGHT_URL = cfg.SNOWDRIFT_RIGHT_URL || '';
  const CHATGPT_LOGO_URL = cfg.CHATGPT_LOGO_URL || '';

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  function cleanup() {
    document.getElementById('aurora-snow-container')?.remove();
    document.getElementById('aurora-garland-container')?.remove();
    document.documentElement.classList.remove('cgpt-snow-on', 'cgpt-snow-logo');
    document.documentElement.style.removeProperty('--aurora-santa-hat-image');
    document.documentElement.style.removeProperty('--aurora-snowdrift-left-image');
    document.documentElement.style.removeProperty('--aurora-snowdrift-right-image');
    document.documentElement.style.removeProperty('--aurora-snow-image');
  }

  function apply() {
    if (!isEnabled()) return;

    const s = getSettings();
    if (!document.body) return;

    if (SANTA_HAT_URL) {
      document.documentElement.style.setProperty('--aurora-santa-hat-image', `url("${SANTA_HAT_URL}")`);
    }
    if (SNOWDRIFT_LEFT_URL) {
      document.documentElement.style.setProperty('--aurora-snowdrift-left-image', `url("${SNOWDRIFT_LEFT_URL}")`);
    }
    if (SNOWDRIFT_RIGHT_URL) {
      document.documentElement.style.setProperty('--aurora-snowdrift-right-image', `url("${SNOWDRIFT_RIGHT_URL}")`);
    }
    if (CHATGPT_LOGO_URL) {
      document.documentElement.style.setProperty('--aurora-snow-image', `url("${CHATGPT_LOGO_URL}")`);
    }

    document.documentElement.classList.toggle('cgpt-snow-on', !!s.enableSnowfall);
    document.documentElement.classList.toggle('cgpt-snow-logo', s.snowType === 'chatgpt-logo' && !!s.enableSnowfall);

    // 1) Snowfall (GPU-friendly: fixed count, CSS animation).
    let snowContainer = document.getElementById('aurora-snow-container');
    if (s.enableSnowfall) {
      if (!snowContainer) {
        snowContainer = document.createElement('div');
        snowContainer.id = 'aurora-snow-container';
        snowContainer.className = 'aurora-snow-container';

        const template = document.createElement('div');
        template.className = 'aurora-snowflake';

        const frag = document.createDocumentFragment();
        for (let i = 0; i < 40; i++) {
          const f = template.cloneNode(true);
          const left = Math.random() * 100;
          const duration = Math.random() * 6 + 6; // 6-12s
          const delay = Math.random() * 8;
          const opacity = Math.random() * 0.5 + 0.4;
          const size = Math.random() * 3 + 2;

          f.style.cssText = `
            left: ${left}vw;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            opacity: ${opacity};
            width: ${size}px;
            height: ${size}px;
          `;
          frag.appendChild(f);
        }

        snowContainer.appendChild(frag);
        document.body.appendChild(snowContainer);
      }
      snowContainer.classList.remove('exiting');
    } else if (snowContainer && !snowContainer.classList.contains('exiting')) {
      snowContainer.classList.add('exiting');
      setTimeout(() => {
        const container = document.getElementById('aurora-snow-container');
        if (!getSettings().enableSnowfall && container) container.remove();
      }, 800);
    }

    // 2) New Year Garland.
    let garlandContainer = document.getElementById('aurora-garland-container');
    if (s.enableNewYear) {
      if (!garlandContainer) {
        garlandContainer = document.createElement('div');
        garlandContainer.id = 'aurora-garland-container';
        garlandContainer.className = 'aurora-garland-container';

        const BULB_COUNT = 30;
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];

        const wireTemplate = document.createElement('div');
        wireTemplate.className = 'aurora-garland-wire-segment';
        const bulbTemplate = document.createElement('div');
        bulbTemplate.className = 'aurora-bulb';

        const frag = document.createDocumentFragment();
        for (let i = 0; i < BULB_COUNT; i++) {
          const sEl = wireTemplate.cloneNode(true);
          const bEl = bulbTemplate.cloneNode(true);
          bEl.style.setProperty('--bulb-color', colors[i % colors.length]);
          bEl.style.animationDelay = i * 0.15 + 's';
          sEl.appendChild(bEl);
          frag.appendChild(sEl);
        }

        garlandContainer.appendChild(frag);
        document.body.appendChild(garlandContainer);
      }
    } else if (garlandContainer) {
      garlandContainer.remove();
    }
  }

  A.holiday.apply = A.holiday.apply || apply;
  A.holiday.cleanup = A.holiday.cleanup || cleanup;
})();

