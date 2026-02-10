// modules/aurora/background.js
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  const cfg = A.config || {};

  const ID = cfg.ID || 'cgpt-ambient-bg';
  const LOCAL_BG_KEY = cfg.LOCAL_BG_KEY || 'customBgData';

  function isEnabled() {
    return A.isEnabled ? A.isEnabled() : true;
  }

  function ensureAppOnTop() {
    const app =
      document.getElementById('__next') ||
      document.querySelector('#root') ||
      document.querySelector('main') ||
      document.body?.firstElementChild;
    if (!app) return;
    const cs = getComputedStyle(app);
    if (cs.position === 'static') app.style.position = 'relative';
    if (!app.style.zIndex || parseInt(app.style.zIndex || '0', 10) < 0) app.style.zIndex = '0';
  }

  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('--cgpt-bg-blur-radius', '60px');
    wrap.style.setProperty('--cgpt-object-fit', 'cover');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none' });

    const createLayerContent = () => `
      <div class="animated-bg">
        <div class="blob"></div><div class="blob"></div><div class="blob"></div>
      </div>
      <video playsinline autoplay muted loop></video>
      <picture>
        <source type="image/webp" srcset="">
        <img alt="" aria-hidden="true" sizes="100vw" loading="eager" fetchpriority="high" src="" srcset="">
      </picture>
    `;

    wrap.innerHTML = `
      <div class="media-layer active" data-layer-id="a">${createLayerContent()}</div>
      <div class="media-layer" data-layer-id="b">${createLayerContent()}</div>
      <div class="haze"></div>
      <div class="overlay"></div>
    `;
    return wrap;
  }

  // ========================================================================
  // BACKGROUND MANAGER - State Machine for Reliable Background Switching
  // ========================================================================
  const BackgroundManager = {
    // State: 'idle' | 'loading' | 'transitioning'
    state: 'idle',
    activeLayerId: 'a',
    currentUrl: null,
    pendingUrl: null,
    abortController: null,
    transitionTimeout: null,
    TRANSITION_MS: 750,
    LOAD_TIMEOUT_MS: 5000,

    // Default background URLs
    DEFAULT_SRCSET:
      'https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w',
    DEFAULT_SRC: 'https://persistent.oaistatic.com/burrito-nux/640.webp',
    VIDEO_EXTENSIONS: ['.mp4', '.webm', '.ogv'],

    getContainer() {
      return document.getElementById(ID);
    },

    getLayer(layerId) {
      const container = this.getContainer();
      return container?.querySelector(`.media-layer[data-layer-id="${layerId}"]`);
    },

    getActiveLayer() {
      return this.getLayer(this.activeLayerId);
    },

    getInactiveLayer() {
      const inactiveId = this.activeLayerId === 'a' ? 'b' : 'a';
      return this.getLayer(inactiveId);
    },

    // Completely clean a layer of all content and classes
    cleanLayer(layer) {
      if (!layer) return;
      layer.classList.remove('active', 'gpt5-active');

      const img = layer.querySelector('img');
      const video = layer.querySelector('video');
      const source = layer.querySelector('source');

      if (img) {
        img.src = '';
        img.srcset = '';
        img.style.display = 'none';
      }
      if (video) {
        video.pause();
        video.src = '';
        video.style.display = 'none';
      }
      if (source) {
        source.srcset = '';
      }
    },

    abort() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
        this.transitionTimeout = null;
      }
      this.pendingUrl = null;
    },

    isVideo(url) {
      if (!url) return false;
      const lower = url.toLowerCase();
      return this.VIDEO_EXTENSIONS.some((ext) => lower.includes(ext)) || lower.startsWith('data:video');
    },

    loadMedia(layer, url) {
      return new Promise((resolve, reject) => {
        if (!layer) {
          reject(new Error('No layer'));
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');
        const isVideoUrl = this.isVideo(url);

        // Set up abort handling
        const abortController = new AbortController();
        this.abortController = abortController;

        // Timeout fallback
        const timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            console.warn('Aurora: Media load timeout, proceeding anyway');
            resolve();
          }
        }, this.LOAD_TIMEOUT_MS);

        const cleanup = () => {
          clearTimeout(timeoutId);
          if (abortController.signal.aborted) {
            reject(new Error('Aborted'));
          }
        };

        if (isVideoUrl) {
          img.style.display = 'none';
          video.style.display = 'block';

          const onReady = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };
          const onError = () => {
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve(); // Still transition on error
          };

          video.addEventListener('loadeddata', onReady, { once: true });
          video.addEventListener('error', onError, { once: true });
          video.src = url;
          video.load();
          video.play().catch(() => {}); // Ignore autoplay errors

          img.src = '';
          img.srcset = '';
          source.srcset = '';
        } else {
          video.style.display = 'none';
          img.style.display = 'block';

          const onReady = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) {
              const s = A.getSettings?.() || {};
              if (s.autoContrast && A.contrast?.engine?.analyze) {
                A.contrast.engine.analyze(img);
              }
              resolve();
            }
          };
          const onError = () => {
            img.removeEventListener('load', onReady);
            img.removeEventListener('error', onError);
            cleanup();
            if (!abortController.signal.aborted) resolve();
          };

          img.addEventListener('load', onReady, { once: true });
          img.addEventListener('error', onError, { once: true });
          img.src = url;
          img.srcset = '';
          source.srcset = '';

          video.src = '';
        }
      });
    },

    loadDefault(layer) {
      return new Promise((resolve) => {
        if (!layer) {
          resolve();
          return;
        }

        const img = layer.querySelector('img');
        const video = layer.querySelector('video');
        const source = layer.querySelector('source');

        video.style.display = 'none';
        video.src = '';
        img.style.display = 'block';

        const onReady = () => {
          img.removeEventListener('load', onReady);
          img.removeEventListener('error', onReady);
          const s = A.getSettings?.() || {};
          if (s.autoContrast && A.contrast?.engine?.analyze) {
            A.contrast.engine.analyze(img);
          }
          resolve();
        };

        img.addEventListener('load', onReady, { once: true });
        img.addEventListener('error', onReady, { once: true });

        img.src = this.DEFAULT_SRC;
        img.srcset = this.DEFAULT_SRCSET;
        source.srcset = this.DEFAULT_SRCSET;
      });
    },

    crossfade(toLayer, fromLayer) {
      return new Promise((resolve) => {
        if (!toLayer || !fromLayer) {
          resolve();
          return;
        }

        const onTransitionEnd = (e) => {
          if (e.propertyName === 'opacity' && e.target === toLayer) {
            toLayer.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
            resolve();
          }
        };

        this.transitionTimeout = setTimeout(() => {
          toLayer.removeEventListener('transitionend', onTransitionEnd);
          this.transitionTimeout = null;
          resolve();
        }, this.TRANSITION_MS + 100);

        toLayer.addEventListener('transitionend', onTransitionEnd);

        requestAnimationFrame(() => {
          toLayer.classList.add('active');
          fromLayer.classList.remove('active');
        });
      });
    },

    async switchTo(url) {
      if (this.state !== 'idle') {
        this.pendingUrl = url;
        this.abort();
        await new Promise((r) => setTimeout(r, 50));
      }

      if (url === this.currentUrl && this.state === 'idle') return;

      const container = this.getContainer();
      if (!container) return;

      const activeLayer = this.getActiveLayer();
      const inactiveLayer = this.getInactiveLayer();
      if (!activeLayer || !inactiveLayer) return;

      try {
        this.state = 'loading';
        this.cleanLayer(inactiveLayer);

        if (url === '__gpt5_animated__') {
          inactiveLayer.classList.add('gpt5-active');
        } else if (url === '__local__') {
          if (chrome?.runtime?.id && chrome?.storage?.local) {
            const localData = await new Promise((resolve) => {
              chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
                if (chrome.runtime.lastError || !res || !res[LOCAL_BG_KEY]) resolve(null);
                else resolve(res[LOCAL_BG_KEY]);
              });
            });

            if (localData) await this.loadMedia(inactiveLayer, localData);
            else await this.loadDefault(inactiveLayer);
          } else {
            await this.loadDefault(inactiveLayer);
          }
        } else if (url) {
          await this.loadMedia(inactiveLayer, url);
        } else {
          await this.loadDefault(inactiveLayer);
        }

        this.state = 'transitioning';
        await this.crossfade(inactiveLayer, activeLayer);

        this.cleanLayer(activeLayer);

        this.activeLayerId = inactiveLayer.dataset.layerId;
        this.currentUrl = url;
        this.state = 'idle';

        if (this.pendingUrl !== null) {
          const pending = this.pendingUrl;
          this.pendingUrl = null;
          this.switchTo(pending);
        }
      } catch (err) {
        this.state = 'idle';
        if (err.message !== 'Aborted') console.error('Aurora BG switch error:', err);
      }
    },

    update() {
      const s = A.getSettings?.() || {};
      this.switchTo(s.customBgUrl);
    },
  };

  function updateBackgroundImage() {
    if (!isEnabled()) return;
    BackgroundManager.update();
  }

  function applyCustomStyles() {
    if (!isEnabled()) return;
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;

    const s = A.getSettings?.() || {};
    const blurPx = `${s.backgroundBlur || '60'}px`;
    const scaling = s.backgroundScaling || 'cover';

    bgNode.style.setProperty('--cgpt-bg-blur-radius', blurPx);
    bgNode.style.setProperty('--cgpt-object-fit', scaling);
  }

  function showBg() {
    if (!isEnabled()) return;
    let node = document.getElementById(ID);
    if (!node) {
      node = makeBgNode();
      const add = () => {
        document.body.prepend(node);
        ensureAppOnTop();
        applyCustomStyles();
        updateBackgroundImage();
        setTimeout(() => node.classList.add('bg-visible'), 50);
      };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    } else {
      node.classList.add('bg-visible');
      updateBackgroundImage();
    }
  }

  A.background = A.background || {};
  A.background.manager = BackgroundManager;
  A.background.show = A.background.show || showBg;
  A.background.applyStyles = A.background.applyStyles || applyCustomStyles;
  A.background.update = A.background.update || updateBackgroundImage;

  A.background.reset =
    A.background.reset ||
    (() => {
      try {
        BackgroundManager.abort();
      } catch (e) {
        // ignore
      }
      BackgroundManager.currentUrl = null;
      BackgroundManager.activeLayerId = 'a';
      BackgroundManager.state = 'idle';
      BackgroundManager.pendingUrl = null;
    });
})();
