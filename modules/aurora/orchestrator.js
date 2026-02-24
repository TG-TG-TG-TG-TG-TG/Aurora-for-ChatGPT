// modules/aurora/orchestrator.js
// Coordinates feature modules; keeps heavy logic outside of content.js.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});

  const cfg = A.config || {};
  const ID = cfg.ID || 'cgpt-ambient-bg';
  const LOCAL_BG_KEY = cfg.LOCAL_BG_KEY || 'customBgData';
  const SELECTORS = cfg.SELECTORS || {};

  const debounce = A.utils?.debounce || ((fn) => fn);

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  class AuroraBackgroundController {
    ensure() {
      A.background?.show?.();
    }
    applyStyles() {
      A.background?.applyStyles?.();
    }
    update() {
      A.background?.update?.();
    }
  }

  class AuroraQuickSettingsController {
    ensure() {
      A.quickSettings?.ensure?.();
    }
    remove() {
      A.quickSettings?.remove?.();
    }
  }

  class AuroraRootFlagsController {
    apply() {
      A.rootFlags?.apply?.();
    }
  }

  class AuroraUpgradeController {
    applyLimitPopup() {
      A.upgrade?.applyLimitPopup?.();
    }
    applyUpgradeButtons() {
      A.upgrade?.applyUpgradeButtons?.();
    }
  }

  class AuroraGlassController {
    tagFast(root = document) {
      A.glass?.tagFast?.(root);
    }
    tagAll(root = document) {
      A.glass?.tagAll?.(root);
    }
    scheduleFullScan() {
      A.glass?.scheduleFullScan?.();
    }
    hasSlowHints(node) {
      return !!A.glass?.hasSlowHints?.(node);
    }
    tagAncestorsForSlowHints(root) {
      A.glass?.tagAncestorsForSlowHints?.(root);
    }
  }

  class AuroraDefaultModelController {
    maybeApply(force = false) {
      A.defaultModel?.maybeApply?.(force);
    }
  }

  class AuroraTokenCounterController {
    apply() {
      A.tokenCounter?.apply?.();
    }
  }

  class AuroraAudioController {
    ensureContext() {
      const s = getSettings();
      if (s.soundEnabled) A.audio?.ensureContext?.();
    }
    attachOrDetach() {
      const s = getSettings();
      if (s.soundEnabled) A.audio?.attachIfEnabled?.();
      else A.audio?.detach?.();
    }
  }

  class AuroraContrastController {
    apply() {
      const s = getSettings();
      if (!s.autoContrast) {
        document.documentElement.style.removeProperty('--bg-opacity');
        return;
      }

      const bgNode = document.getElementById(ID);
      if (!bgNode) return;
      const activeImg = bgNode.querySelector('.media-layer.active img');
      if (activeImg && activeImg.complete) {
        A.contrast?.engine?.analyze?.(activeImg);
      }
    }
  }

  class AuroraDataMaskingController {
    applyInitial() {
      A.masking?.applyInitial?.();
    }
  }

  class AuroraHolidayController {
    apply() {
      A.holiday?.apply?.();
    }
  }

  class AuroraMessageQueueController {
    pulse() {
      A.queue?.pulse?.();
    }
    schedulePulse(delay = 0) {
      A.queue?.schedulePulse?.(delay);
    }
    shutdown() {
      A.queue?.shutdown?.();
    }
    isEnabled() {
      return !!A.queue?.isEnabled?.();
    }
    hasWork() {
      return !!A.queue?.hasWork?.();
    }
  }

  class AuroraOrchestrator {
    constructor() {
      this.observersStarted = false;
      this.welcomeScreenChecked = false;

      this.background = new AuroraBackgroundController();
      this.quickSettings = new AuroraQuickSettingsController();
      this.rootFlags = new AuroraRootFlagsController();
      this.upgrade = new AuroraUpgradeController();
      this.glass = new AuroraGlassController();
      this.defaultModel = new AuroraDefaultModelController();
      this.tokenCounter = new AuroraTokenCounterController();
      this.audio = new AuroraAudioController();
      this.contrast = new AuroraContrastController();
      this.dataMasking = new AuroraDataMaskingController();
      this.holiday = new AuroraHolidayController();
      this.queue = new AuroraMessageQueueController();
    }

    init() {
      if (!chrome?.runtime?.sendMessage) return;

      // Initialize i18n system with ChatGPT language detection (optional).
      (async () => {
        try {
          await A.i18n?.initialize?.();
        } catch (e) {
          // ignore
        }
      })();

      const initialLoad = () => {
        this.refreshSettingsAndApply();
        this.startObservers();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialLoad, { once: true });
      } else {
        initialLoad();
      }

      chrome.storage.onChanged.addListener((changes, area) => this.onStorageChanged(changes, area));
    }

    refreshSettingsAndApply() {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (freshSettings) => {
        if (chrome.runtime.lastError || !freshSettings) return;

        // Welcome screen once per session.
        if (!this.welcomeScreenChecked) {
          if (freshSettings.extensionEnabled !== false && !freshSettings.hasSeenWelcomeScreen) {
            try {
              A.welcome?.show?.(() => this.applyAllSettings());
            } catch (e) {
              // ignore
            }
          }
          this.welcomeScreenChecked = true;
        }

        // Keep a stable settings object reference.
        A.state = A.state || {};
        A.state.settings = A.state.settings || {};
        Object.assign(A.state.settings, freshSettings);

        this.applyAllSettings();
      });
    }

    applyAllSettings() {
      if (!isEnabled()) {
        this.queue.shutdown();
        A.disable?.all?.();
        return;
      }

      this.background.ensure();

      const s = getSettings();
      if (!s.hideQuickSettings) this.quickSettings.ensure();
      else this.quickSettings.remove();

      this.rootFlags.apply();
      this.background.applyStyles();
      this.background.update();

      this.upgrade.applyLimitPopup();
      this.upgrade.applyUpgradeButtons();

      this.glass.tagFast(document);
      this.glass.scheduleFullScan();

      this.defaultModel.maybeApply();

      // Token counter (do not modify its implementation; only toggle).
      this.tokenCounter.apply();

      // Optional engines.
      this.audio.ensureContext();
      this.audio.attachOrDetach();
      this.contrast.apply();
      this.dataMasking.applyInitial();
      this.holiday.apply();

      this.queue.pulse();
    }

    startObservers() {
      if (this.observersStarted) return;
      this.observersStarted = true;

      // Pause animations and video when tab is not visible.
      document.addEventListener(
        'visibilitychange',
        () => {
          if (!isEnabled()) {
            document.documentElement.classList.remove('cgpt-tab-hidden');
            return;
          }

          const bgNode = document.getElementById(ID);
          document.documentElement.classList.toggle('cgpt-tab-hidden', document.hidden);
          if (!bgNode) return;

          const videos = bgNode.querySelectorAll('video');
          videos.forEach((video) => {
            if (document.hidden) {
              video.pause();
            } else if (video.style.display !== 'none') {
              video.play().catch(() => {});
            }
          });
        },
        { passive: true }
      );

      window.addEventListener('focus', () => this.applyAllSettings(), { passive: true });

      let lastUrl = location.href;
      const checkUrl = debounce(() => {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        this.applyAllSettings();
      }, 50);

      window.addEventListener('popstate', checkUrl, { passive: true });

      const originalPushState = history.pushState;
      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(checkUrl, 0);
      };

      // Debounce less-critical UI checks that don't cause flicker.
      const debouncedOtherChecks = debounce(() => {
        this.upgrade.applyLimitPopup();
        this.defaultModel.maybeApply();
        this.upgrade.applyUpgradeButtons();
      }, 150);

      let renderFrameId = null;
      this.domObserverCallback = ({ addedElements }) => {
        if (document.hidden || !isEnabled()) return;
        if (renderFrameId) return;

        let urgentUiUpdate = false;
        const newNodesToProcess = [];
        const slowGlassNodes = [];
        
        // Fast paths - preallocate arrays and avoid function calls in the hot loop
        const elements = addedElements || [];
        const len = elements.length;

        for (let i = 0; i < len; i++) {
            const n = elements[i];
            newNodesToProcess.push(n);

            // We use a high-performance TreeWalker rather than querySelector/getElementsByClassName
            // This is O(N) over only the exact sub-nodes, bypassing the browser's CSS matcher
            let needsWalk = !urgentUiUpdate || (slowGlassNodes.length < 3);
            
            if (needsWalk) {
                const walker = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT, null, false);
                let current = walker.currentNode;
                
                while (current) {
                    // 1. Check for Urgent UI Updates (popovers, dialogs, menus)
                    if (!urgentUiUpdate) {
                        const cl = current.classList;
                        if (cl && cl.contains('popover')) {
                            urgentUiUpdate = true;
                        } else {
                            const role = current.getAttribute && current.getAttribute('role');
                            if (role === 'dialog' || role === 'menu') {
                                urgentUiUpdate = true;
                            }
                        }
                    }

                    // 2. Check for slow glass hints
                    if (slowGlassNodes.length < 3 && this.glass.hasSlowHints(current)) {
                        slowGlassNodes.push(current);
                    }

                    // Early exit if we found everything we need in this subtree
                    if (urgentUiUpdate && slowGlassNodes.length >= 3) {
                       break;
                    }

                    current = walker.nextNode();
                }
            }
        }

        renderFrameId = requestAnimationFrame(() => {
          if (!isEnabled()) {
            renderFrameId = null;
            return;
          }

          if (urgentUiUpdate) this.upgrade.applyUpgradeButtons();

          newNodesToProcess.forEach((node) => this.glass.tagFast(node));
          if (slowGlassNodes.length) {
            slowGlassNodes.forEach((node) => {
              this.glass.tagAncestorsForSlowHints(node);
              this.glass.tagAll(node);
            });
          }
          if (urgentUiUpdate || slowGlassNodes.length) this.glass.scheduleFullScan();

          // Message queue (throttled; ChatGPT mutates DOM constantly during generation).
          if (this.queue.isEnabled() || this.queue.hasWork()) {
            this.queue.schedulePulse(0);
          }

          renderFrameId = null;
        });

        if (isEnabled()) debouncedOtherChecks();
      };

      if (window.AuroraExt?.centralObserver) {
          window.AuroraExt.centralObserver.subscribe(this.domObserverCallback);
      }

      const themeObserver = new MutationObserver(() => {
        const s = getSettings();
        if (s.theme === 'auto') this.rootFlags.apply();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    onStorageChanged(changes, area) {
      if (area === 'sync') {
        const changedKeys = Object.keys(changes);
        const settings = getSettings();

        changedKeys.forEach((key) => {
          if (changes[key]) settings[key] = changes[key].newValue;
        });

        if (changedKeys.includes('extensionEnabled')) {
          this.queue.shutdown();
          if (!isEnabled()) {
            A.disable?.all?.();
            return;
          }
          // Re-hydrate authoritative state from background cache (includes defaults).
          this.refreshSettingsAndApply();
          return;
        }

        if (!isEnabled()) return;

        if (changes.queueWhileGenerating) this.queue.schedulePulse(0);

        if (changes.enableSnowfall || changes.enableNewYear) this.holiday.apply();

        const rootFlagKeys = [
          'legacyComposer',
          'disableAnimations',
          'focusMode',
          'cuteVoiceUI',
          'blurChatHistory',
          'blurAvatar',
          'theme',
          'customFont',
          'voiceColor',
          'appearance',
          'cinemaMode',
        ];
        if (changedKeys.some((k) => rootFlagKeys.includes(k))) {
          this.rootFlags.apply();
        }

        if (changes.customBgUrl || changes.backgroundBlur || changes.backgroundScaling) {
          this.background.update();
          this.background.applyStyles();
        }

        if (changes.hideGpt5Limit) this.upgrade.applyLimitPopup();
        if (changes.hideUpgradeButtons) this.upgrade.applyUpgradeButtons();

        if (changes.hideQuickSettings !== undefined) {
          if (!settings.hideQuickSettings) this.quickSettings.ensure();
          else this.quickSettings.remove();
        }

        if (changes.defaultModel) this.defaultModel.maybeApply();

        if (changes.showTokenCounter) this.tokenCounter.apply();

        if (changes.soundEnabled || changes.soundVolume) {
          this.audio.ensureContext();
          this.audio.attachOrDetach();
        }
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        if (isEnabled()) this.background.update();
      }
    }
  }

  A.orchestrator = A.orchestrator || {};
  A.orchestrator.AuroraOrchestrator = A.orchestrator.AuroraOrchestrator || AuroraOrchestrator;
})();

