/**
 * Aurora for ChatGPT - Token Counter
 * Real-time word and token counting
 */

(() => {
    'use strict';

    const Aurora = window.Aurora;

    // ============================================================================
    // Encoding configuration
    // ============================================================================
    const DEFAULT_ENCODING = 'o200k_base';
    const SECONDARY_ENCODING = 'cl100k_base';

    const ENCODING_HINTS = [
        { regex: /(gpt-4o|gpt-4\.1|o4|4\.1|4o|o3|o1|gpt-5)/i, encoding: 'o200k_base' },
        { regex: /(gpt-4|gpt-3\.5|3\.5|turbo|davinci|curie|babbage|ada)/i, encoding: 'cl100k_base' }
    ];

    // ============================================================================
    // Token Counter Class
    // ============================================================================
    class TokenCounter {
        static _instance = null;

        static getInstance() {
            if (!TokenCounter._instance) {
                TokenCounter._instance = new TokenCounter();
            }
            return TokenCounter._instance;
        }

        constructor() {
            if (TokenCounter._instance) {
                throw new Error('TokenCounter is a singleton');
            }

            this.element = null;
            this.textareaObserver = null;
            this.currentTextarea = null;
            this.currentListener = null;
            this.retryTimeoutId = null;
            this.enabled = false;

            this.tiktokenModulePromise = null;
            this.encoderPromises = {};
            this.encoderCache = {};

            this.lastText = '';
            this.lastTokenCount = 0;
            this.lastApproximate = true;
            this.updateSequence = 0;
        }

        // ========================================
        // Public API
        // ========================================

        manage(enabled) {
            this.enabled = enabled;

            if (enabled) {
                this._warmupEncoders();
                this._setupTextareaMonitoring();
            } else {
                this._cleanup();
            }
        }

        update(text) {
            if (!this.enabled) return;
            this._updateCounter(text);
        }

        // ========================================
        // Encoding & Token Counting
        // ========================================

        async _loadTiktokenModule() {
            if (!this.tiktokenModulePromise) {
                const jsUrl = this._getRuntimeUrl('vendor/tiktoken-lite/tiktoken.js');
                const wasmUrl = this._getRuntimeUrl('vendor/tiktoken-lite/tiktoken_bg.wasm');

                this.tiktokenModulePromise = import(jsUrl).then(async (module) => {
                    await module.init(wasmUrl);
                    return module;
                }).catch((err) => {
                    console.error('Aurora TokenCounter: Failed to load tiktoken', err);
                    this.tiktokenModulePromise = null;
                    throw err;
                });
            }
            return this.tiktokenModulePromise;
        }

        async _getEncoder(encodingName) {
            if (this.encoderCache[encodingName]) return this.encoderCache[encodingName];

            if (!this.encoderPromises[encodingName]) {
                this.encoderPromises[encodingName] = (async () => {
                    const [{ Tiktoken }, dataModule] = await Promise.all([
                        this._loadTiktokenModule(),
                        import(this._getRuntimeUrl(`vendor/tiktoken-lite/encoders/${encodingName}.js`))
                    ]);
                    const data = dataModule.default || dataModule;
                    const encoder = new Tiktoken(data.bpe_ranks, data.special_tokens, data.pat_str);
                    this.encoderCache[encodingName] = encoder;
                    return encoder;
                })().catch((err) => {
                    console.error(`Aurora TokenCounter: Failed to init encoder ${encodingName}`, err);
                    delete this.encoderPromises[encodingName];
                    throw err;
                });
            }
            return this.encoderPromises[encodingName];
        }

        async _countTokens(text) {
            const preferred = this._resolveEncoding();
            const order = preferred === DEFAULT_ENCODING
                ? [preferred, SECONDARY_ENCODING]
                : [preferred, DEFAULT_ENCODING];

            for (const encodingName of order) {
                try {
                    const encoder = await this._getEncoder(encodingName);
                    const tokens = encoder.encode_ordinary(text);
                    return { count: tokens.length, approximate: false };
                } catch (err) {
                    console.warn(`Aurora TokenCounter: Encoder ${encodingName} failed`, err);
                }
            }

            return { count: this._estimateTokens(this._countWords(text)), approximate: true };
        }

        _warmupEncoders() {
            const preferred = this._resolveEncoding();
            this._getEncoder(preferred)
                .catch(() => preferred !== DEFAULT_ENCODING ? this._getEncoder(DEFAULT_ENCODING) : null)
                .catch(() => { });
        }

        _disposeEncoders() {
            Object.values(this.encoderCache).forEach((encoder) => {
                try { encoder?.free?.(); } catch (e) { }
            });
            Object.keys(this.encoderCache).forEach(k => delete this.encoderCache[k]);
            Object.keys(this.encoderPromises).forEach(k => delete this.encoderPromises[k]);
            this.tiktokenModulePromise = null;
            this.lastText = '';
            this.lastTokenCount = 0;
            this.lastApproximate = true;
        }

        // ========================================
        // Helpers
        // ========================================

        _getRuntimeUrl(path) {
            try {
                if (chrome?.runtime?.getURL) return chrome.runtime.getURL(path);
            } catch (e) { }
            return null;
        }

        _countWords(text) {
            if (!text?.trim()) return 0;
            return text.trim().split(/\s+/).filter(Boolean).length;
        }

        _estimateTokens(wordCount) {
            return Math.ceil(wordCount * 1.3);
        }

        _detectModelLabel() {
            const button = document.querySelector(Aurora.SELECTORS?.MODEL_SWITCHER || '[data-testid="model-switcher-dropdown-button"]');
            if (!button) return '';
            return (button.getAttribute('aria-label') || button.textContent || '').trim().toLowerCase();
        }

        _resolveEncoding() {
            const label = this._detectModelLabel();
            for (const hint of ENCODING_HINTS) {
                if (hint.regex.test(label)) return hint.encoding;
            }
            return DEFAULT_ENCODING;
        }

        _getTokenLimit() {
            const label = this._detectModelLabel();
            const limits = Aurora.MODEL_CONFIG?.TOKEN_LIMITS || {};

            for (const [slug, limit] of Object.entries(limits)) {
                if (slug !== 'default' && label.includes(slug.replace(/-/g, ' '))) {
                    return limit;
                }
            }
            return limits['default'] || 128000;
        }

        _calculatePercentage(tokens) {
            const limit = this._getTokenLimit();
            return Math.min(100, (tokens / limit) * 100);
        }

        _getColorClass(percentage) {
            if (percentage >= 90) return 'critical';
            if (percentage >= 70) return 'warning';
            return 'normal';
        }

        // ========================================
        // UI
        // ========================================

        _getOrCreateElement() {
            if (!this.element) {
                this.element = document.createElement('div');
                this.element.id = Aurora.ELEMENT_IDS?.TOKEN_COUNTER || 'aurora-token-counter';
                this.element.innerHTML = `
          <div class="token-counter-top">
            <span class="token-counter-label">Words:</span>
            <span class="token-counter-value" id="word-count">0</span>
            <span class="token-counter-separator"></span>
            <span class="token-counter-label">Tokens:</span>
            <span class="token-counter-value" id="token-count">0</span>
          </div>
          <div class="token-budget-bar-container">
            <div class="token-budget-bar" id="token-budget-bar">
              <div class="token-budget-fill" id="token-budget-fill"></div>
            </div>
            <span class="token-budget-text" id="token-budget-text">0%</span>
          </div>
        `;
                document.body.appendChild(this.element);
            }
            return this.element;
        }

        _setVisibility(wordCount) {
            if (!this.element) return;
            this.element.classList.toggle('visible', wordCount > 0);
        }

        _render(wordCount, tokenCount, approximate) {
            const el = this._getOrCreateElement();

            const wordEl = el.querySelector('#word-count');
            const tokenEl = el.querySelector('#token-count');
            const fillEl = el.querySelector('#token-budget-fill');
            const textEl = el.querySelector('#token-budget-text');

            if (wordEl) wordEl.textContent = wordCount;
            if (tokenEl) tokenEl.textContent = approximate ? `~${tokenCount}` : `${tokenCount}`;

            if (fillEl && textEl && tokenCount > 0) {
                const percentage = this._calculatePercentage(tokenCount);
                const limit = this._getTokenLimit();
                const colorClass = this._getColorClass(percentage);

                fillEl.style.width = `${Math.min(percentage, 100)}%`;
                fillEl.className = `token-budget-fill ${colorClass}`;
                textEl.textContent = `${Math.round(percentage)}% of ${(limit / 1000).toFixed(0)}k`;
            } else if (fillEl && textEl) {
                fillEl.style.width = '0%';
                fillEl.className = 'token-budget-fill normal';
                textEl.textContent = '0%';
            }

            this._setVisibility(wordCount);
        }

        _renderLoading(wordCount) {
            const el = this._getOrCreateElement();
            const wordEl = el.querySelector('#word-count');
            const tokenEl = el.querySelector('#token-count');

            if (wordEl) wordEl.textContent = wordCount;
            if (tokenEl) tokenEl.textContent = wordCount > 0 ? '...' : '0';

            this._setVisibility(wordCount);
        }

        // ========================================
        // Counter Logic
        // ========================================

        _updateCounter(text) {
            if (!this.enabled) return;

            const normalizedText = typeof text === 'string' ? text : '';
            const wordCount = this._countWords(normalizedText);
            const requestId = ++this.updateSequence;

            if (!normalizedText.trim()) {
                this.lastText = '';
                this.lastTokenCount = 0;
                this.lastApproximate = false;
                this._render(0, 0, false);
                return;
            }

            if (normalizedText === this.lastText) {
                this._render(wordCount, this.lastTokenCount, this.lastApproximate);
                return;
            }

            this._renderLoading(wordCount);

            this._countTokens(normalizedText)
                .then(({ count, approximate }) => {
                    if (!this.enabled || requestId !== this.updateSequence) return;
                    this.lastText = normalizedText;
                    this.lastTokenCount = count;
                    this.lastApproximate = approximate;
                    this._render(wordCount, count, approximate);
                })
                .catch((err) => {
                    console.error('Aurora TokenCounter: Counting failed', err);
                    if (!this.enabled || requestId !== this.updateSequence) return;
                    const fallback = this._estimateTokens(wordCount);
                    this.lastText = normalizedText;
                    this.lastTokenCount = fallback;
                    this.lastApproximate = true;
                    this._render(wordCount, fallback, true);
                });
        }

        // ========================================
        // Textarea Monitoring
        // ========================================

        _findTextarea() {
            const selectors = [
                '#prompt-textarea',
                'textarea[id*="prompt"]',
                'textarea[placeholder*="Message"]',
                'textarea[placeholder*="Send"]',
                '[contenteditable="true"][role="textbox"]',
                'form textarea',
                'textarea'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el.offsetParent !== null && !el.disabled) {
                        return el;
                    }
                }
            }
            return null;
        }

        _detachListeners() {
            if (this.currentTextarea && this.currentListener) {
                this.currentTextarea.removeEventListener('input', this.currentListener);
                this.currentTextarea.removeEventListener('change', this.currentListener);
                this.currentTextarea.removeEventListener('keyup', this.currentListener);
            }
            this.currentTextarea = null;
            this.currentListener = null;
        }

        _setupTextareaMonitoring() {
            if (!this.enabled) return;

            const textarea = this._findTextarea();

            if (!textarea) {
                if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
                this.retryTimeoutId = setTimeout(() => {
                    this.retryTimeoutId = null;
                    this._setupTextareaMonitoring();
                }, 1000);
                return;
            }

            if (this.currentTextarea === textarea) return;

            this._detachListeners();
            this.currentTextarea = textarea;

            this.currentListener = () => {
                if (!this.enabled) return;
                const text = textarea.value || textarea.textContent || '';
                this._updateCounter(text);
            };

            textarea.addEventListener('input', this.currentListener);
            textarea.addEventListener('change', this.currentListener);
            textarea.addEventListener('keyup', this.currentListener);

            this.currentListener();

            if (this.textareaObserver) {
                this.textareaObserver.disconnect();
            }

            this.textareaObserver = new MutationObserver(() => {
                if (!this.enabled) return;
                const newTextarea = this._findTextarea();
                if (newTextarea && newTextarea !== this.currentTextarea) {
                    this._setupTextareaMonitoring();
                }
            });

            this.textareaObserver.observe(document.body, { childList: true, subtree: true });
        }

        _cleanup() {
            if (this.retryTimeoutId) {
                clearTimeout(this.retryTimeoutId);
                this.retryTimeoutId = null;
            }
            if (this.textareaObserver) {
                this.textareaObserver.disconnect();
                this.textareaObserver = null;
            }
            this._detachListeners();
            this._disposeEncoders();

            if (this.element) {
                this.element.remove();
                this.element = null;
            }
        }
    }

    // ============================================================================
    // Export
    // ============================================================================
    const counter = TokenCounter.getInstance();

    window.AuroraTokenCounter = {
        manage: (enabled) => counter.manage(enabled),
        update: (text) => counter.update(text)
    };

    Aurora.TokenCounter = TokenCounter;
    window.Aurora = Aurora;
})();
