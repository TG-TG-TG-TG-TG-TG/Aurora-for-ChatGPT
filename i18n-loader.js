// i18n-loader.js - Dynamic language loader for ChatGPT language detection
(() => {
  // Language mapping between ChatGPT locale codes and extension locale codes
  const LOCALE_MAP = {
    'en': 'en',
    'en-US': 'en',
    'es': 'es',
    'es-ES': 'es',
    'ru': 'ru',
    'ru-RU': 'ru',
    'fr': 'fr',
    'fr-FR': 'fr',
    'zh': 'zh_CN',
    'zh-CN': 'zh_CN',
    'zh-Hans': 'zh_CN',
  };

  // Cache for loaded translations
  let translationsCache = {};
  let detectedLocale = null;

  /**
   * Detects language from ChatGPT settings
   * ChatGPT stores language in multiple places, we check all of them
   */
  function detectChatGPTLanguage() {
    try {
      // Method 1: Try to get language from HTML lang attribute (most reliable)
      const htmlLang = document.documentElement.lang;
      if (htmlLang && htmlLang !== 'en') {
        console.log('Aurora: Detected ChatGPT language from HTML lang:', htmlLang);
        return htmlLang;
      }

      // Method 2: Try localStorage keys that ChatGPT might use
      const localStorageKeys = [
        'i18nextLng',           // Common i18next key
        'chatgpt-locale',       // Possible ChatGPT key
        'oai-locale',          // OpenAI locale
        'language',            // Generic language key
        'locale',              // Generic locale key
        'userLanguage'         // User language preference
      ];

      for (const key of localStorageKeys) {
        const value = localStorage.getItem(key);
        if (value && value !== 'en-US' && value !== 'en') {
          console.log(`Aurora: Detected ChatGPT language from localStorage[${key}]:`, value);
          return value;
        }
      }

      // Method 3: Check all localStorage for language-related data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('lang') || key.includes('locale') || key.includes('i18n'))) {
          const value = localStorage.getItem(key);
          if (value && value.length >= 2 && value.length <= 10) {
            // Validate it looks like a locale code
            if (/^[a-z]{2}(-[A-Z]{2})?$/i.test(value) && value !== 'en' && value !== 'en-US') {
              console.log(`Aurora: Found language in localStorage[${key}]:`, value);
              return value;
            }
          }
        }
      }

      // Method 4: Try to detect from meta tags
      const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content ||
                       document.querySelector('meta[name="language"]')?.content;
      if (metaLang && metaLang !== 'en') {
        console.log('Aurora: Detected ChatGPT language from meta:', metaLang);
        return metaLang;
      }

      // Method 5: Check if there's a language selector button visible
      const langButton = document.querySelector('[data-testid="language-selector"]') ||
                        document.querySelector('[aria-label*="language"]') ||
                        document.querySelector('[aria-label*="Language"]');
      if (langButton) {
        const buttonText = langButton.textContent || langButton.getAttribute('aria-label') || '';
        // Try to extract language code from button text
        if (buttonText.includes('Русский') || buttonText.includes('Russian')) return 'ru';
        if (buttonText.includes('Français') || buttonText.includes('French')) return 'fr';
        if (buttonText.includes('Español') || buttonText.includes('Spanish')) return 'es';
        if (buttonText.includes('中文') || buttonText.includes('Chinese')) return 'zh';
      }

    } catch (e) {
      console.warn('Aurora: Could not detect ChatGPT language:', e);
    }
    
    console.log('Aurora: No ChatGPT language detected, will use browser language');
    return null;
  }

  /**
   * Gets browser language as fallback
   */
  function getBrowserLanguage() {
    try {
      if (chrome?.i18n?.getUILanguage) {
        return chrome.i18n.getUILanguage();
      }
    } catch (e) {
      console.warn('Aurora: Could not get browser language:', e);
    }
    return navigator.language || navigator.userLanguage || 'en';
  }

  /**
   * Normalizes locale code to extension format
   */
  function normalizeLocale(locale) {
    if (!locale) return 'en';
    
    // Try exact match first
    if (LOCALE_MAP[locale]) {
      return LOCALE_MAP[locale];
    }

    // Try language code without region
    const langCode = locale.split('-')[0];
    if (LOCALE_MAP[langCode]) {
      return LOCALE_MAP[langCode];
    }

    // Default to English
    return 'en';
  }

  /**
   * Loads translations for a specific locale
   */
  async function loadTranslations(locale) {
    const normalizedLocale = normalizeLocale(locale);
    
    // Return cached translations if available
    if (translationsCache[normalizedLocale]) {
      return translationsCache[normalizedLocale];
    }

    try {
      // For Chrome extensions, we need to use chrome.runtime.getURL
      const messagesUrl = chrome.runtime.getURL(`_locales/${normalizedLocale}/messages.json`);
      const response = await fetch(messagesUrl);
      
      if (!response.ok) {
        console.warn(`Aurora: Could not load translations for ${normalizedLocale}, falling back to English`);
        // Fallback to English
        if (normalizedLocale !== 'en') {
          return loadTranslations('en');
        }
        return {};
      }

      const messages = await response.json();
      
      // Convert Chrome i18n format to simple key-value
      const translations = {};
      for (const [key, value] of Object.entries(messages)) {
        translations[key] = value.message;
      }

      translationsCache[normalizedLocale] = translations;
      console.log(`Aurora: Loaded translations for ${normalizedLocale}`);
      return translations;

    } catch (e) {
      console.error(`Aurora: Error loading translations for ${normalizedLocale}:`, e);
      // Fallback to Chrome's built-in i18n
      return null;
    }
  }

  /**
   * Gets a translated message
   * @param {string} key - Message key
   * @param {string|Array} substitutions - Optional substitutions
   * @returns {string} Translated message
   */
  function getMessage(key, substitutions) {
    // First, try to use the detected locale translations
    if (detectedLocale && translationsCache[detectedLocale]) {
      const message = translationsCache[detectedLocale][key];
      if (message) {
        // Handle substitutions
        if (substitutions) {
          if (typeof substitutions === 'string') {
            return message.replace('$1', substitutions);
          } else if (Array.isArray(substitutions)) {
            let result = message;
            substitutions.forEach((sub, index) => {
              result = result.replace(`$${index + 1}`, sub);
            });
            return result;
          }
        }
        return message;
      }
    }

    // Fallback to Chrome's built-in i18n
    try {
      if (chrome?.i18n?.getMessage && chrome.runtime?.id) {
        const text = chrome.i18n.getMessage(key, substitutions);
        if (text) return text;
      }
    } catch (e) {
      console.warn('Aurora: Chrome i18n fallback failed:', e);
    }

    // Last resort: return the key itself
    return key;
  }

  /**
   * Initializes the i18n system with retry logic
   */
  async function initializeI18n(retryCount = 0) {
    // Wait a bit for ChatGPT to set HTML lang attribute (only on first try)
    if (retryCount === 0 && document.readyState !== 'complete') {
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve, { once: true });
          // Fallback timeout
          setTimeout(resolve, 1000);
        }
      });
    }

    // Detect language preference
    let chatgptLang = detectChatGPTLanguage();
    const browserLang = getBrowserLanguage();
    
    // If no ChatGPT language detected and this is first attempt, wait and retry
    if (!chatgptLang && retryCount === 0) {
      console.log('Aurora: No ChatGPT language detected, waiting 500ms and retrying...');
      await new Promise(resolve => setTimeout(resolve, 500));
      chatgptLang = detectChatGPTLanguage();
    }
    
    // Priority: ChatGPT language > Browser language
    const preferredLang = chatgptLang || browserLang;
    detectedLocale = normalizeLocale(preferredLang);

    console.log(`Aurora: Language detection - ChatGPT: ${chatgptLang || 'not detected'}, Browser: ${browserLang}, Using: ${detectedLocale}`);

    // Load translations for the detected locale
    await loadTranslations(detectedLocale);

    // Also preload English as fallback
    if (detectedLocale !== 'en') {
      await loadTranslations('en');
    }

    return detectedLocale;
  }

  /**
   * Re-check language (useful after page navigation)
   */
  async function recheckLanguage() {
    const newChatGPTLang = detectChatGPTLanguage();
    const newLocale = normalizeLocale(newChatGPTLang || getBrowserLanguage());
    
    if (newLocale !== detectedLocale) {
      console.log(`Aurora: Language changed from ${detectedLocale} to ${newLocale}`);
      detectedLocale = newLocale;
      await loadTranslations(detectedLocale);
      return true; // Language changed
    }
    return false; // Language unchanged
  }

  // Export functions
  window.AuroraI18n = {
    initialize: initializeI18n,
    getMessage: getMessage,
    getDetectedLocale: () => detectedLocale,
    detectChatGPTLanguage: detectChatGPTLanguage,
    recheckLanguage: recheckLanguage,
    getBrowserLanguage: getBrowserLanguage,
    // Debug function to see all detection attempts
    debugLanguageDetection: () => {
      console.log('=== Aurora Language Detection Debug ===');
      console.log('HTML lang attribute:', document.documentElement.lang);
      console.log('Browser language:', getBrowserLanguage());
      console.log('ChatGPT language:', detectChatGPTLanguage());
      console.log('Current detected locale:', detectedLocale);
      console.log('All localStorage keys:', Object.keys(localStorage));
      console.log('Language-related localStorage:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('lang') || key.includes('locale') || key.includes('i18n'))) {
          console.log(`  ${key}:`, localStorage.getItem(key));
        }
      }
      console.log('=======================================');
    }
  };
})();

