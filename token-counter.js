// Token/Word Counter Module
// This module provides real-time token and word counting for the ChatGPT composer

let tokenCounterElement = null;
let textareaObserver = null;
let currentTextarea = null;
let currentTextareaListener = null;
let retryTimeoutId = null;
let isTokenCounterEnabled = false;
let tiktokenModulePromise = null;
const encoderPromises = {};
const encoderCache = {};
let lastCountedText = '';
let lastTokenCount = 0;
let lastTokenApproximate = true;
let updateSequence = 0;

const DEFAULT_ENCODING = 'o200k_base';
const SECONDARY_ENCODING = 'cl100k_base';
const ENCODING_HINTS = [
    { regex: /(gpt-4o|gpt-4\.1|o4|4\.1|4o|o3|o1|gpt-5)/i, encoding: 'o200k_base' },
    { regex: /(gpt-4|gpt-3\.5|3\.5|turbo|davinci|curie|babbage|ada)/i, encoding: 'cl100k_base' }
];

function getRuntimeUrl(path) {
    try {
        if (chrome?.runtime?.getURL) {
            return chrome.runtime.getURL(path);
        }
    } catch (e) {
        /* Ignore, fall through */
    }
    return path;
}

/**
 * Count words in text
 */
function countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate tokens from word count
 * Rough approximation: 1 word ≈ 1.3 tokens
 */
function estimateTokens(wordCount) {
    return Math.ceil(wordCount * 1.3);
}

function detectModelLabel() {
    const button = document.querySelector('[data-testid="model-switcher-dropdown-button"]');
    if (!button) return '';
    return (button.getAttribute('aria-label') || button.textContent || '').trim().toLowerCase();
}

function resolveEncodingName() {
    const label = detectModelLabel();
    for (const hint of ENCODING_HINTS) {
        if (hint.regex.test(label)) return hint.encoding;
    }
    return DEFAULT_ENCODING;
}

async function loadTiktokenModule() {
    if (!tiktokenModulePromise) {
        const url = getRuntimeUrl('vendor/tiktoken-lite/tiktoken.js');
        tiktokenModulePromise = import(url).catch((err) => {
            console.error('[Aurora Token Counter] Failed to load tiktoken module', err);
            tiktokenModulePromise = null;
            throw err;
        });
    }
    return tiktokenModulePromise;
}

async function getEncoder(encodingName) {
    if (encoderCache[encodingName]) return encoderCache[encodingName];
    if (!encoderPromises[encodingName]) {
        encoderPromises[encodingName] = (async () => {
            const [{ Tiktoken }, dataModule] = await Promise.all([
                loadTiktokenModule(),
                import(getRuntimeUrl(`vendor/tiktoken-lite/encoders/${encodingName}.js`))
            ]);
            const data = dataModule.default || dataModule;
            const encoder = new Tiktoken(data.bpe_ranks, data.special_tokens, data.pat_str);
            encoderCache[encodingName] = encoder;
            return encoder;
        })().catch((err) => {
            console.error(`[Aurora Token Counter] Failed to init encoder ${encodingName}`, err);
            delete encoderPromises[encodingName];
            throw err;
        });
    }
    return encoderPromises[encodingName];
}

function disposeEncoders() {
    Object.values(encoderCache).forEach((encoder) => {
        try {
            encoder?.free?.();
        } catch (e) {
            /* Ignore cleanup errors */
        }
    });
    Object.keys(encoderCache).forEach((key) => delete encoderCache[key]);
    Object.keys(encoderPromises).forEach((key) => delete encoderPromises[key]);
    tiktokenModulePromise = null;
    lastCountedText = '';
    lastTokenCount = 0;
    lastTokenApproximate = true;
}

async function countTokensWithTiktoken(text) {
    const preferred = resolveEncodingName();
    const order = preferred === DEFAULT_ENCODING
        ? [preferred, SECONDARY_ENCODING]
        : [preferred, DEFAULT_ENCODING];

    for (const encodingName of order) {
        try {
            const encoder = await getEncoder(encodingName);
            const tokens = encoder.encode_ordinary(text);
            return { count: tokens.length, approximate: false };
        } catch (err) {
            console.warn(`[Aurora Token Counter] Encoder ${encodingName} failed, trying fallback`, err);
        }
    }

    return { count: estimateTokens(countWords(text)), approximate: true };
}

function warmupEncoders() {
    const preferred = resolveEncodingName();
    getEncoder(preferred)
        .catch(() => {
            if (preferred !== DEFAULT_ENCODING) {
                return getEncoder(DEFAULT_ENCODING);
            }
            return null;
        })
        .catch(() => {
            /* Ignore warmup failures */
        });
}

/**
 * Create or get token counter element
 */
function getOrCreateTokenCounter() {
    if (!tokenCounterElement) {
        tokenCounterElement = document.createElement('div');
        tokenCounterElement.id = 'aurora-token-counter';
        tokenCounterElement.innerHTML = `
      <span class="token-counter-label">Words:</span>
      <span class="token-counter-value" id="word-count">0</span>
      <span class="token-counter-separator"></span>
      <span class="token-counter-label">Tokens:</span>
      <span class="token-counter-value" id="token-count">0</span>
    `;
        document.body.appendChild(tokenCounterElement);
    }
    return tokenCounterElement;
}

function setCounterVisibility(wordCount) {
    if (!tokenCounterElement) return;
    if (wordCount > 0) {
        tokenCounterElement.classList.add('visible');
    } else {
        tokenCounterElement.classList.remove('visible');
    }
}

function renderCounter(wordCount, tokenCount, approximate) {
    const counter = getOrCreateTokenCounter();
    const wordElement = counter.querySelector('#word-count');
    const tokenElement = counter.querySelector('#token-count');

    if (wordElement) wordElement.textContent = wordCount;
    if (tokenElement) tokenElement.textContent = approximate ? `~${tokenCount}` : `${tokenCount}`;

    setCounterVisibility(wordCount);
}

function renderLoading(wordCount) {
    const counter = getOrCreateTokenCounter();
    const wordElement = counter.querySelector('#word-count');
    const tokenElement = counter.querySelector('#token-count');
    if (wordElement) wordElement.textContent = wordCount;
    if (tokenElement) tokenElement.textContent = wordCount > 0 ? '...' : '0';
    setCounterVisibility(wordCount);
}

/**
 * Update counter display
 */
function updateTokenCounter(text) {
    if (!isTokenCounterEnabled) return;

    const normalizedText = typeof text === 'string' ? text : '';
    const wordCount = countWords(normalizedText);
    const requestId = ++updateSequence;

    if (!normalizedText.trim()) {
        lastCountedText = '';
        lastTokenCount = 0;
        lastTokenApproximate = false;
        renderCounter(0, 0, false);
        return;
    }

    if (normalizedText === lastCountedText) {
        renderCounter(wordCount, lastTokenCount, lastTokenApproximate);
        return;
    }

    renderLoading(wordCount);

    countTokensWithTiktoken(normalizedText)
        .then(({ count, approximate }) => {
            if (!isTokenCounterEnabled || requestId !== updateSequence) return;
            lastCountedText = normalizedText;
            lastTokenCount = count;
            lastTokenApproximate = approximate;
            renderCounter(wordCount, count, approximate);
        })
        .catch((err) => {
            console.error('[Aurora Token Counter] Counting failed, showing estimate', err);
            if (!isTokenCounterEnabled || requestId !== updateSequence) return;
            const fallback = estimateTokens(wordCount);
            lastCountedText = normalizedText;
            lastTokenCount = fallback;
            lastTokenApproximate = true;
            renderCounter(wordCount, fallback, true);
        });
}

/**
 * Find the composer textarea
 */
function findComposerTextarea() {
    // Try multiple selectors to find the textarea
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
            // Check if element is visible and not disabled
            if (el.offsetParent !== null && !el.disabled) {
                console.log('[Aurora Token Counter] Found textarea:', selector);
                return el;
            }
        }
    }

    console.warn('[Aurora Token Counter] Textarea not found, will retry...');
    return null;
}

function detachTextareaListeners() {
    if (currentTextarea && currentTextareaListener) {
        currentTextarea.removeEventListener('input', currentTextareaListener);
        currentTextarea.removeEventListener('change', currentTextareaListener);
        currentTextarea.removeEventListener('keyup', currentTextareaListener);
    }
    currentTextarea = null;
    currentTextareaListener = null;
}

function clearMonitoringArtifacts() {
    if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
    }
    if (textareaObserver) {
        textareaObserver.disconnect();
        textareaObserver = null;
    }
    detachTextareaListeners();
}

/**
 * Setup textarea monitoring
 */
function setupTextareaMonitoring() {
    if (!isTokenCounterEnabled) return;

    const textarea = findComposerTextarea();

    if (!textarea) {
        // Retry after a delay if textarea not found
        if (retryTimeoutId) clearTimeout(retryTimeoutId);
        retryTimeoutId = setTimeout(() => {
            retryTimeoutId = null;
            setupTextareaMonitoring();
        }, 1000);
        return;
    }

    // Skip if already monitoring this textarea
    if (currentTextarea === textarea) return;

    detachTextareaListeners();
    currentTextarea = textarea;
    console.log('[Aurora Token Counter] Monitoring textarea');

    // Update on input
    currentTextareaListener = () => {
        if (!isTokenCounterEnabled) return;
        const text = textarea.value || textarea.textContent || '';
        updateTokenCounter(text);
    };

    textarea.addEventListener('input', currentTextareaListener);
    textarea.addEventListener('change', currentTextareaListener);
    textarea.addEventListener('keyup', currentTextareaListener);

    // Initial update
    currentTextareaListener();

    // Watch for textarea replacement (ChatGPT may recreate it)
    if (textareaObserver) {
        textareaObserver.disconnect();
    }

    textareaObserver = new MutationObserver(() => {
        if (!isTokenCounterEnabled) return;
        const newTextarea = findComposerTextarea();
        if (newTextarea && newTextarea !== currentTextarea) {
            setupTextareaMonitoring();
        }
    });

    textareaObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Initialize or remove token counter based on settings
 */
function manageTokenCounter(enabled) {
    console.log('[Aurora Token Counter] Manage:', enabled);
    isTokenCounterEnabled = enabled;

    if (enabled) {
        warmupEncoders();
        setupTextareaMonitoring();
    } else {
        clearMonitoringArtifacts();
        disposeEncoders();

        // Remove counter
        if (tokenCounterElement) {
            tokenCounterElement.remove();
            tokenCounterElement = null;
            console.log('[Aurora Token Counter] Removed');
        }
    }
}

// Export for use in content.js
if (typeof window !== 'undefined') {
    window.AuroraTokenCounter = {
        manage: manageTokenCounter,
        update: updateTokenCounter
    };
}
