// modules/aurora/utils.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.utils = A.utils || {};

  A.utils.getCachedElement = A.utils.getCachedElement || ((key, queryFn) => {
    const cache = A.cache?.ui;
    if (cache && cache[key] && cache[key].isConnected) return cache[key];
    const element = queryFn();
    if (element && cache) cache[key] = element;
    return element;
  });

  A.utils.debounce = A.utils.debounce || ((func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  });

  A.utils.toggleClassForElements = A.utils.toggleClassForElements || ((elements, className, force) => {
    elements.forEach((el) => {
      if (el) el.classList.toggle(className, force);
    });
  });

  A.utils.safeRequestIdleCallback =
    A.utils.safeRequestIdleCallback ||
    ((callback, options) => {
      if (window.requestIdleCallback) window.requestIdleCallback(callback, options);
      else setTimeout(callback, 1);
    });

  A.utils.normalizeToken =
    A.utils.normalizeToken ||
    ((value) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim());
})();

