(() => {
    'use strict';

    const PATTERNS = {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
        creditCard: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
        vin: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
        ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        ipv6: /\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
        macAddress: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
        phoneRU: /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
        inn: /\b\d{10}(?:\d{2})?\b/g,
        snils: /\b\d{3}-\d{3}-\d{3}\s\d{2}\b/g,
        passportRU: /\b\d{2}\s?\d{2}\s?\d{6}\b/g,
        stsRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        ptsRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        driverLicenseRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        phoneUS: /\b\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
        passportUS: /\b[A-Z]{1,2}\d{7,8}\b/g,
        nino: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}\b/g,
        nhs: /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
        iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
        vat: /\b[A-Z]{2}\d{8,12}\b/g,
        chineseID: /\b\d{17}[\dXx]\b/g,
        aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
        pan: /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g,
        cpf: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    };

    const Generators = {
        randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        randomDigits: (count) => Array.from({ length: count }, () => Generators.randomInt(0, 9)).join(''),
        randomLetter: () => String.fromCharCode(65 + Generators.randomInt(0, 25)),
        email: () => `user${Generators.randomDigits(4)}@${['gmail.com', 'yahoo.com', 'mail.ru'][Generators.randomInt(0, 2)]}`,
        creditCard: () => Array.from({ length: 4 }, () => Generators.randomDigits(4)).join(' '),
        vin: () => Array.from({ length: 17 }, () => 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Generators.randomInt(0, 32)]).join(''),
        ipv4: () => Array.from({ length: 4 }, () => Generators.randomInt(0, 255)).join('.'),
        macAddress: () => Array.from({ length: 6 }, () => Generators.randomDigits(2)).join(':'),
        phoneRU: () => `+7 (${Generators.randomDigits(3)}) ${Generators.randomDigits(3)}-${Generators.randomDigits(2)}-${Generators.randomDigits(2)}`,
        inn: () => Generators.randomDigits(10),
        snils: () => `${Generators.randomDigits(3)}-${Generators.randomDigits(3)}-${Generators.randomDigits(3)} ${Generators.randomDigits(2)}`,
        passportRU: () => `${Generators.randomDigits(2)} ${Generators.randomDigits(2)} ${Generators.randomDigits(6)}`,
        stsRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        ptsRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        driverLicenseRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        ssn: () => `${Generators.randomDigits(3)}-${Generators.randomDigits(2)}-${Generators.randomDigits(4)}`,
        phoneUS: () => `(${Generators.randomDigits(3)}) ${Generators.randomDigits(3)}-${Generators.randomDigits(4)}`,
        passportUS: () => `${Generators.randomLetter()}${Generators.randomDigits(8)}`,
        nino: () => `AB${Generators.randomDigits(6)}C`,
        nhs: () => `${Generators.randomDigits(3)} ${Generators.randomDigits(3)} ${Generators.randomDigits(4)}`,
        iban: () => `DE${Generators.randomDigits(20)}`,
        vat: () => `DE${Generators.randomDigits(9)}`,
        chineseID: () => `${Generators.randomDigits(17)}${Generators.randomInt(0, 1) ? 'X' : Generators.randomInt(0, 9)}`,
        aadhaar: () => `${Generators.randomDigits(4)} ${Generators.randomDigits(4)} ${Generators.randomDigits(4)}`,
        pan: () => `${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomDigits(4)}${Generators.randomLetter()}`,
        cpf: () => `${Generators.randomDigits(3)}.${Generators.randomDigits(3)}.${Generators.randomDigits(3)}-${Generators.randomDigits(2)}`,
    };

    class DataMaskingEngine {
        constructor() {
            this.originalData = new Map(); // reserved for potential restore feature
            this.settings = { dataMaskingEnabled: false, maskingRandomMode: false, extensionEnabled: true };
            this.initialized = false;
            this.observer = null;
            this.pendingNodes = [];
            this.processQueued = false;

            // Chunked scanning queue to avoid long tasks on large DOM subtrees.
            this.scanQueue = []; // [{ root, walker }]
            this.scanScheduled = false;
            this.queuedRoots = new WeakSet();
        }

        async init() {
            if (this.initialized) return;
            try {
                if (chrome?.storage?.sync) {
                    const result = await new Promise(resolve => {
                        chrome.storage.sync.get(['dataMaskingEnabled', 'maskingRandomMode', 'extensionEnabled'], resolve);
                    });
                    this.settings.dataMaskingEnabled = !!result.dataMaskingEnabled;
                    this.settings.maskingRandomMode = !!result.maskingRandomMode;
                    this.settings.extensionEnabled = result.extensionEnabled !== false;
                    this.initialized = true;

                    if (this.settings.dataMaskingEnabled && this.settings.extensionEnabled) {
                        this.startObserver();
                        if (document.body) {
                            this.maskElement(document.body);
                        }
                    }

                    chrome.storage.onChanged.addListener((changes, area) => {
                        if (area === 'sync') {
                            if (changes.dataMaskingEnabled !== undefined) {
                                this.settings.dataMaskingEnabled = !!changes.dataMaskingEnabled.newValue;
                                if (this.settings.dataMaskingEnabled && this.settings.extensionEnabled) {
                                    this.startObserver();
                                    if (document.body) this.maskElement(document.body);
                                } else {
                                    this.stopObserver();
                                }
                            }
                            if (changes.maskingRandomMode !== undefined) {
                                this.settings.maskingRandomMode = !!changes.maskingRandomMode.newValue;
                            }
                            if (changes.extensionEnabled !== undefined) {
                                this.settings.extensionEnabled = changes.extensionEnabled.newValue !== false;
                                if (this.settings.extensionEnabled && this.settings.dataMaskingEnabled) {
                                    this.startObserver();
                                    if (document.body) this.maskElement(document.body);
                                } else {
                                    this.stopObserver();
                                }
                            }
                        }
                    });
                }
            } catch (e) { }
        }

        startObserver() {
            if (this.observer) return;

            this.observer = new MutationObserver((mutations) => {
                if (!this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) return;

                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.pendingNodes.push(node);
                        } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                            this.maskTextNode(node);
                        }
                    }
                }

                if (this.pendingNodes.length > 0 && !this.processQueued) {
                    this.processQueued = true;
                    requestAnimationFrame(() => {
                        const nodes = this.pendingNodes.splice(0);
                        nodes.forEach(n => this.maskElement(n));
                        this.processQueued = false;
                    });
                }
            });

            const target = document.body || document.documentElement;
            if (target) {
                // Perf: do not observe characterData (streaming text updates fire constantly).
                // We only mask newly added nodes; this matches the current implementation.
                this.observer.observe(target, { childList: true, subtree: true });
            }
        }

        stopObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }

        isEnabled() {
            return !!this.settings.dataMaskingEnabled;
        }

        getMask(type, originalText) {
            if (this.settings.maskingRandomMode) {
                const generator = Generators[type];
                if (generator) return generator();
            }
            const length = originalText.length;
            if (type === 'email') {
                const parts = originalText.split('@');
                return '*****@*****' + (parts[1] ? '.' + parts[1].split('.').pop() : '');
            } else if (type === 'creditCard') {
                return '**** **** **** ' + originalText.slice(-4);
            } else if (type.includes('phone')) {
                return originalText.slice(0, 2) + ' (***) ***-**-**';
            } else if (type === 'passportRU') {
                return '** ** ******';
            } else if (type === 'inn') {
                return '**********';
            } else if (type === 'snils') {
                return '***-***-*** **';
            } else if (type === 'ssn') {
                return '***-**-****';
            } else if (type === 'ipv4') {
                return '***.***.***.***';
            }
            return '*'.repeat(Math.min(length, 12));
        }

        maskTextNode(node) {
            if (!this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) return;
            if (!node?.textContent?.trim()) return;
            const parent = node.parentElement;
            if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA'].includes(parent.tagName)) return;

            let text = node.textContent;
            let modified = false;

            for (const [type, pattern] of Object.entries(PATTERNS)) {
                pattern.lastIndex = 0;
                text = text.replace(pattern, (match) => {
                    modified = true;
                    return this.getMask(type, match);
                });
            }

            if (modified) node.textContent = text;
        }

        maskElement(element) {
            if (!element || !this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) return;
            // Queue scans; chunk processing avoids blocking the main thread for large inserts.
            this.enqueueScan(element);
        }

        enqueueScan(root) {
            if (!root || !this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) return;
            // WeakSet prevents flooding the queue with the same root repeatedly.
            if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                if (this.queuedRoots.has(root)) return;
                this.queuedRoots.add(root);
            }

            this.scanQueue.push({ root, walker: null });
            this.scheduleScan();
        }

        scheduleScan() {
            if (this.scanScheduled) return;
            if (!this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) return;

            this.scanScheduled = true;
            const run = (deadline) => {
                this.scanScheduled = false;
                this.runScan(deadline);
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(run, { timeout: 800 });
            } else {
                setTimeout(() => run(null), 16);
            }
        }

        runScan(deadline) {
            if (!this.settings.dataMaskingEnabled || !this.settings.extensionEnabled) {
                this.scanQueue.length = 0;
                return;
            }

            const start = performance.now();
            const TIME_BUDGET_MS = 8;
            const NODE_LIMIT = 220;

            while (this.scanQueue.length > 0) {
                const task = this.scanQueue[0];
                const root = task.root;

                if (!task.walker) {
                    task.walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                        acceptNode: (node) => {
                            if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
                            const p = node.parentElement;
                            if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA'].includes(p.tagName)) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    });
                }

                let processed = 0;
                let done = false;
                while (processed < NODE_LIMIT) {
                    const node = task.walker.nextNode();
                    if (!node) { done = true; break; }
                    this.maskTextNode(node);
                    processed++;

                    if (deadline && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 3) break;
                    if (performance.now() - start > TIME_BUDGET_MS) break;
                }

                if (done) {
                    this.scanQueue.shift();
                    try { this.queuedRoots.delete(root); } catch (e) { /* ignore */ }
                    continue;
                }

                // Not done yet; continue later.
                break;
            }

            if (this.scanQueue.length > 0) {
                this.scheduleScan();
            }
        }

        restore() {
            this.originalData.clear();
        }
    }

    const engine = new DataMaskingEngine();
    window.DataMaskingEngine = engine;

    // Single initialization point with flag to prevent duplicates
    let initCalled = false;
    const initOnce = () => {
        if (initCalled) return;
        initCalled = true;
        engine.init();
    };

    // Use a single pattern for initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnce, { once: true });
    } else if (document.body) {
        // Document already loaded with body
        initOnce();
    } else {
        // Rare edge case: document loaded but no body yet
        const earlyObserver = new MutationObserver(() => {
            if (document.body) {
                earlyObserver.disconnect();
                initOnce();
            }
        });
        earlyObserver.observe(document.documentElement, { childList: true });
    }
})();
