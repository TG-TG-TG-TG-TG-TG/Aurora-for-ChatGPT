/**
 * Aurora for ChatGPT - Settings Manager
 * Singleton pattern for managing extension settings
 */

(() => {
    const Aurora = window.Aurora;

    /**
     * Settings manager (Singleton)
     * Provides a single point of access to settings and their synchronization
     */
    class SettingsManager {
        static _instance = null;

        /**
         * Get the single instance
         * @returns {SettingsManager}
         */
        static getInstance() {
            if (!SettingsManager._instance) {
                SettingsManager._instance = new SettingsManager();
            }
            return SettingsManager._instance;
        }

        constructor() {
            if (SettingsManager._instance) {
                throw new Error('SettingsManager is a singleton. Use SettingsManager.getInstance()');
            }

            this._settings = { ...Aurora.DEFAULTS };
            this._listeners = new Set();
            this._initialized = false;
            this._initPromise = null;
        }

        /**
         * Initialize settings from storage
         * @returns {Promise<Object>}
         */
        async init() {
            if (this._initPromise) {
                return this._initPromise;
            }

            this._initPromise = this._loadFromStorage();
            await this._initPromise;
            this._setupStorageListener();
            this._initialized = true;

            return this._settings;
        }

        /**
         * Load settings from chrome.storage.sync
         * @private
         */
        async _loadFromStorage() {
            try {
                const result = await Aurora.getStorageSync(Object.keys(Aurora.DEFAULTS));
                this._settings = { ...Aurora.DEFAULTS, ...result };
            } catch (e) {
                console.warn('Aurora SettingsManager: Failed to load settings, using defaults');
                this._settings = { ...Aurora.DEFAULTS };
            }
            return this._settings;
        }

        /**
         * Setup storage change listener
         * @private
         */
        _setupStorageListener() {
            if (!chrome?.storage?.onChanged) return;

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area !== 'sync') return;

                const changedKeys = [];
                for (const key in changes) {
                    if (Object.prototype.hasOwnProperty.call(this._settings, key)) {
                        this._settings[key] = changes[key].newValue;
                        changedKeys.push(key);
                    }
                }

                if (changedKeys.length > 0) {
                    this._notifyListeners(changedKeys);
                }
            });
        }

        /**
         * Notify subscribers about changes
         * @param {string[]} changedKeys - Changed keys
         * @private
         */
        _notifyListeners(changedKeys) {
            for (const listener of this._listeners) {
                try {
                    listener(this._settings, changedKeys);
                } catch (e) {
                    console.error('Aurora SettingsManager: Listener error:', e);
                }
            }
        }

        /**
         * Get setting value
         * @param {string} key - Setting key
         * @returns {*}
         */
        get(key) {
            return this._settings[key];
        }

        /**
         * Get all settings
         * @returns {Object}
         */
        getAll() {
            return { ...this._settings };
        }

        /**
         * Set setting value
         * @param {string} key - Setting key
         * @param {*} value - Value
         * @returns {Promise<boolean>}
         */
        async set(key, value) {
            this._settings[key] = value;
            return Aurora.setStorageSync({ [key]: value });
        }

        /**
         * Set multiple settings
         * @param {Object} data - Settings object
         * @returns {Promise<boolean>}
         */
        async setMultiple(data) {
            Object.assign(this._settings, data);
            return Aurora.setStorageSync(data);
        }

        /**
         * Reset setting to default value
         * @param {string} key - Setting key
         * @returns {Promise<boolean>}
         */
        async reset(key) {
            if (Aurora.DEFAULTS.hasOwnProperty(key)) {
                return this.set(key, Aurora.DEFAULTS[key]);
            }
            return false;
        }

        /**
         * Reset all settings to default values
         * @returns {Promise<boolean>}
         */
        async resetAll() {
            this._settings = { ...Aurora.DEFAULTS };
            return Aurora.setStorageSync(Aurora.DEFAULTS);
        }

        /**
         * Subscribe to settings changes
         * @param {Function} callback - Callback function (settings, changedKeys)
         * @returns {Function} - Unsubscribe function
         */
        subscribe(callback) {
            this._listeners.add(callback);
            return () => this._listeners.delete(callback);
        }

        /**
         * Check initialization status
         * @returns {boolean}
         */
        isInitialized() {
            return this._initialized;
        }

        /**
         * Wait for initialization
         * @returns {Promise<Object>}
         */
        async whenReady() {
            if (this._initialized) {
                return this._settings;
            }
            return this.init();
        }
    }

    // Export
    Aurora.SettingsManager = SettingsManager;
    window.Aurora = Aurora;
})();
