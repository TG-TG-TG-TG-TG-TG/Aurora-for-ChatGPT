// modules/aurora/fonts.js
// Lazy-load Google Fonts only when the user selects a custom font.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.fonts = A.fonts || {};

  const FONT_STYLESHEET_ID = 'aurora-google-fonts';
  const GOOGLE_FONT_URLS = {
    inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
    opensans: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
    poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    firacode: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600&display=swap',
  };

  let lastFontHref = null;

  function cleanup() {
    document.getElementById(FONT_STYLESHEET_ID)?.remove();
    lastFontHref = null;
  }

  function ensure(customFont) {
    const key = String(customFont || 'system').toLowerCase();
    const href = GOOGLE_FONT_URLS[key] || null;
    const existing = document.getElementById(FONT_STYLESHEET_ID);

    if (!href) {
      if (existing) existing.remove();
      lastFontHref = null;
      return;
    }

    if (existing && (existing.getAttribute('href') === href || lastFontHref === href)) return;

    const link = existing || document.createElement('link');
    link.id = FONT_STYLESHEET_ID;
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    lastFontHref = href;

    const parent = document.head || document.documentElement;
    parent.appendChild(link);
  }

  A.fonts.ensure = A.fonts.ensure || ensure;
  A.fonts.cleanup = A.fonts.cleanup || cleanup;
})();

