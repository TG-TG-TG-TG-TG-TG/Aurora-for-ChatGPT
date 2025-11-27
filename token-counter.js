// Token/Word Counter Module
// This module provides real-time token and word counting for the ChatGPT composer

let tokenCounterElement = null;
let textareaObserver = null;
let currentTextarea = null;

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
      <span class="token-counter-value" id="token-count">~0</span>
    `;
        document.body.appendChild(tokenCounterElement);
    }
    return tokenCounterElement;
}

/**
 * Update counter display
 */
function updateTokenCounter(text) {
    const counter = getOrCreateTokenCounter();
    const wordCount = countWords(text);
    const tokenCount = estimateTokens(wordCount);

    const wordElement = counter.querySelector('#word-count');
    const tokenElement = counter.querySelector('#token-count');

    if (wordElement) wordElement.textContent = wordCount;
    if (tokenElement) tokenElement.textContent = `~${tokenCount}`;

    // Show/hide based on content
    if (wordCount > 0) {
        counter.classList.add('visible');
    } else {
        counter.classList.remove('visible');
    }
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

/**
 * Setup textarea monitoring
 */
function setupTextareaMonitoring() {
    const textarea = findComposerTextarea();

    if (!textarea) {
        // Retry after a delay if textarea not found
        setTimeout(setupTextareaMonitoring, 1000);
        return;
    }

    // Skip if already monitoring this textarea
    if (currentTextarea === textarea) return;

    currentTextarea = textarea;
    console.log('[Aurora Token Counter] Monitoring textarea');

    // Update on input
    const handleInput = () => {
        const text = textarea.value || textarea.textContent || '';
        updateTokenCounter(text);
    };

    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('change', handleInput);
    textarea.addEventListener('keyup', handleInput);

    // Initial update
    handleInput();

    // Watch for textarea replacement (ChatGPT may recreate it)
    if (textareaObserver) {
        textareaObserver.disconnect();
    }

    textareaObserver = new MutationObserver(() => {
        const newTextarea = findComposerTextarea();
        if (newTextarea && newTextarea !== currentTextarea) {
            currentTextarea = null;
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

    if (enabled) {
        setupTextareaMonitoring();
    } else {
        // Remove counter
        if (tokenCounterElement) {
            tokenCounterElement.remove();
            tokenCounterElement = null;
            console.log('[Aurora Token Counter] Removed');
        }

        // Disconnect observer
        if (textareaObserver) {
            textareaObserver.disconnect();
            textareaObserver = null;
        }

        currentTextarea = null;
    }
}

// Export for use in content.js
if (typeof window !== 'undefined') {
    window.AuroraTokenCounter = {
        manage: manageTokenCounter,
        update: updateTokenCounter
    };
}
