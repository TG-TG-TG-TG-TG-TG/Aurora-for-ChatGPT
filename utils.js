/**
 * Aurora for ChatGPT - Utilities
 * Helper functions used across all modules
 */

// Get namespace (should already be created in constants.js)
const Aurora = window.Aurora;

// ============================================================================
// Debounce / Throttle
// ============================================================================

/**
 * Creates a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in ms
 * @returns {Function}
 */
Aurora.debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Creates a throttled version of a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum interval in ms
 * @returns {Function}
 */
Aurora.throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Wait for element to appear or condition to be met
 * @param {Function|string} getter - Function or CSS selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Element|null>}
 */
Aurora.waitFor = (getter, timeout = 1200) => {
    return new Promise((resolve) => {
        const start = performance.now();
        const tick = () => {
            const value = typeof getter === 'function' ? getter() : document.querySelector(getter);
            if (value) {
                resolve(value);
                return;
            }
            if (performance.now() - start >= timeout) {
                resolve(null);
                return;
            }
            requestAnimationFrame(tick);
        };
        tick();
    });
};

/**
 * Toggle class for array of elements
 * @param {Element[]} elements - Array of DOM elements
 * @param {string} className - Class name
 * @param {boolean} force - Force value
 */
Aurora.toggleClassForElements = (elements, className, force) => {
    elements.forEach(el => {
        if (el) el.classList.toggle(className, force);
    });
};

/**
 * Check element visibility
 * @param {Element} el - DOM element
 * @returns {boolean}
 */
Aurora.isElementVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

/**
 * Normalize text for comparison
 * @param {string} value - Source text
 * @returns {string}
 */
Aurora.normalizeToken = (value) => {
    return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

// ============================================================================
// UI Element Caching
// ============================================================================

Aurora._uiCache = {};

/**
 * Get cached element
 * @param {string} key - Cache key
 * @param {Function} queryFn - Element search function
 * @returns {Element|null}
 */
Aurora.getCachedElement = (key, queryFn) => {
    if (Aurora._uiCache[key] && Aurora._uiCache[key].isConnected) {
        return Aurora._uiCache[key];
    }
    const element = queryFn();
    if (element) Aurora._uiCache[key] = element;
    return element;
};

/**
 * Clear UI elements cache
 */
Aurora.clearUICache = () => {
    Aurora._uiCache = {};
};

// ============================================================================
// Localization
// ============================================================================

/**
 * Get localized message
 * @param {string} key - Message key
 * @param {string|string[]} substitutions - Substitutions
 * @returns {string}
 */
Aurora.getMessage = (key, substitutions) => {
    try {
        // First try AuroraI18n (detects ChatGPT language)
        if (window.AuroraI18n?.getMessage) {
            const text = window.AuroraI18n.getMessage(key, substitutions);
            if (text && text !== key) return text;
        }
        // Fallback to Chrome i18n
        if (chrome?.i18n?.getMessage && chrome.runtime?.id) {
            const text = chrome.i18n.getMessage(key, substitutions);
            if (text) return text;
        }
    } catch (e) {
        // Suppress extension context errors
    }
    return key;
};

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Safely get data from chrome.storage.sync
 * @param {string[]} keys - Keys to retrieve
 * @returns {Promise<Object>}
 */
Aurora.getStorageSync = (keys) => {
    return new Promise((resolve) => {
        try {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Aurora: Storage sync error:', chrome.runtime.lastError);
                        resolve({});
                    } else {
                        resolve(result);
                    }
                });
            } else {
                resolve({});
            }
        } catch (e) {
            resolve({});
        }
    });
};

/**
 * Safely save data to chrome.storage.sync
 * @param {Object} data - Data to save
 * @returns {Promise<boolean>}
 */
Aurora.setStorageSync = (data) => {
    return new Promise((resolve) => {
        try {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.set(data, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Aurora: Storage sync set error:', chrome.runtime.lastError);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                resolve(false);
            }
        } catch (e) {
            resolve(false);
        }
    });
};

/**
 * Safely get data from chrome.storage.local
 * @param {string[]} keys - Keys to retrieve
 * @returns {Promise<Object>}
 */
Aurora.getStorageLocal = (keys) => {
    return new Promise((resolve) => {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Aurora: Storage local error:', chrome.runtime.lastError);
                        resolve({});
                    } else {
                        resolve(result);
                    }
                });
            } else {
                resolve({});
            }
        } catch (e) {
            resolve({});
        }
    });
};

/**
 * Safely save data to chrome.storage.local
 * @param {Object} data - Data to save
 * @returns {Promise<boolean>}
 */
Aurora.setStorageLocal = (data) => {
    return new Promise((resolve) => {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Aurora: Storage local set error:', chrome.runtime.lastError);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } else {
                resolve(false);
            }
        } catch (e) {
            resolve(false);
        }
    });
};

// ============================================================================
// Misc Utilities
// ============================================================================

/**
 * Generate random integer
 * @param {number} min - Minimum (inclusive)
 * @param {number} max - Maximum (inclusive)
 * @returns {number}
 */
Aurora.randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random digits
 * @param {number} count - Number of digits
 * @returns {string}
 */
Aurora.randomDigits = (count) => Array.from({ length: count }, () => Aurora.randomInt(0, 9)).join('');

/**
 * Generate random letter (A-Z)
 * @returns {string}
 */
Aurora.randomLetter = () => String.fromCharCode(65 + Aurora.randomInt(0, 25));

// All utilities exported via Aurora namespace

