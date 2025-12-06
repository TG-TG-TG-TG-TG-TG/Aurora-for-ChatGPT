/**
 * Aurora for ChatGPT - Background Manager
 * Background image and animation management
 */

(() => {
    const Aurora = window.Aurora;

    /**
     * Background image manager
     */
    class BackgroundManager {
        constructor(settingsManager) {
            this.settings = settingsManager;
            this.bgNode = null;
            this.styleNode = null;
            this.activeLayerId = 'a';
            this.isTransitioning = false;
        }

        /**
         * Initialize background element
         */
        init() {
            if (this.bgNode) return;

            this.bgNode = this._createBgNode();
            this._insertBgNode();
            this._applyCustomStyles();
            this.updateImage();
        }

        /**
         * Create background DOM structure
         * @private
         */
        _createBgNode() {
            const wrap = document.createElement('div');
            wrap.id = Aurora.ELEMENT_IDS.BACKGROUND;
            wrap.setAttribute('aria-hidden', 'true');
            Object.assign(wrap.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '-1',
                pointerEvents: 'none'
            });

            const layerContent = `
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
        <div class="media-layer active" data-layer-id="a">${layerContent}</div>
        <div class="media-layer" data-layer-id="b">${layerContent}</div>
        <div class="haze"></div>
        <div class="overlay"></div>
      `;

            return wrap;
        }

        /**
         * Insert background element into DOM
         * @private
         */
        _insertBgNode() {
            const add = () => {
                if (!this.bgNode) return;
                document.body.prepend(this.bgNode);
                this._ensureAppOnTop();
                setTimeout(() => this.bgNode?.classList.add('bg-visible'), 50);
            };

            if (document.body) {
                add();
            } else {
                document.addEventListener('DOMContentLoaded', add, { once: true });
            }
        }

        /**
         * Ensure correct application z-index
         * @private
         */
        _ensureAppOnTop() {
            const app = document.getElementById('__next') ||
                document.querySelector('#root') ||
                document.querySelector('main') ||
                document.body.firstElementChild;
            if (!app) return;

            const cs = getComputedStyle(app);
            if (cs.position === 'static') app.style.position = 'relative';
            if (!app.style.zIndex || parseInt(app.style.zIndex || '0', 10) < 0) {
                app.style.zIndex = '0';
            }
        }

        /**
         * Apply custom styles (blur, scaling)
         * @private
         */
        _applyCustomStyles() {
            const apply = () => {
                if (!this.styleNode) {
                    this.styleNode = document.createElement('style');
                    this.styleNode.id = Aurora.ELEMENT_IDS.STYLES;
                    (document.head || document.documentElement || document.body)?.appendChild(this.styleNode);
                }

                const blurPx = `${this.settings.get('backgroundBlur') || '60'}px`;
                const scaling = this.settings.get('backgroundScaling') || 'contain';

                this.styleNode.textContent = `
          #${Aurora.ELEMENT_IDS.BACKGROUND} img, 
          #${Aurora.ELEMENT_IDS.BACKGROUND} video {
            --cgpt-bg-blur-radius: ${blurPx};
            object-fit: ${scaling};
          }
          #${Aurora.ELEMENT_IDS.BACKGROUND} {
            opacity: 0;
            transition: opacity 500ms ease-in-out;
          }
          #${Aurora.ELEMENT_IDS.BACKGROUND}.bg-visible {
            opacity: 1;
          }
        `;
            };

            if (!document.head && !document.body) {
                document.addEventListener('DOMContentLoaded', apply, { once: true });
                return;
            }
            apply();
        }

        /**
         * Update background image
         */
        async updateImage() {
            if (!this.bgNode || this.isTransitioning) return;

            const url = this.settings.get('customBgUrl');
            const inactiveLayerId = this.activeLayerId === 'a' ? 'b' : 'a';
            const activeLayer = this.bgNode.querySelector(`.media-layer[data-layer-id="${this.activeLayerId}"]`);
            const inactiveLayer = this.bgNode.querySelector(`.media-layer[data-layer-id="${inactiveLayerId}"]`);

            if (!activeLayer || !inactiveLayer) return;

            // Prepare inactive layer
            inactiveLayer.classList.remove('gpt5-active');
            const inactiveImg = inactiveLayer.querySelector('img');
            const inactiveSource = inactiveLayer.querySelector('source');
            const inactiveVideo = inactiveLayer.querySelector('video');

            const transitionToInactive = () => {
                this.isTransitioning = true;
                inactiveLayer.classList.add('active');
                activeLayer.classList.remove('active');
                this.activeLayerId = inactiveLayerId;
                setTimeout(() => { this.isTransitioning = false; }, Aurora.TIMING.TRANSITION_DURATION);
            };

            // GPT-5 animated background
            if (url === '__gpt5_animated__') {
                inactiveLayer.classList.add('gpt5-active');
                transitionToInactive();
                return;
            }

            const videoExtensions = ['.mp4', '.webm', '.ogv'];

            const applyMedia = (mediaUrl) => {
                const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext)) ||
                    mediaUrl.startsWith('data:video');

                inactiveImg.style.display = isVideo ? 'none' : 'block';
                inactiveVideo.style.display = isVideo ? 'block' : 'none';

                const mediaEl = isVideo ? inactiveVideo : inactiveImg;
                const eventType = isVideo ? 'loadeddata' : 'load';

                const onMediaReady = () => {
                    transitionToInactive();
                    mediaEl.removeEventListener(eventType, onMediaReady);
                    mediaEl.removeEventListener('error', onMediaReady);

                    if (this.settings.get('autoContrast') && !isVideo && Aurora.ContrastEngine) {
                        Aurora.ContrastEngine.analyze(inactiveImg);
                    }
                };

                mediaEl.addEventListener(eventType, onMediaReady, { once: true });
                mediaEl.addEventListener('error', onMediaReady, { once: true });

                if (isVideo) {
                    inactiveVideo.src = mediaUrl;
                    inactiveVideo.load();
                    inactiveVideo.play().catch(() => { });
                    inactiveImg.src = '';
                    inactiveImg.srcset = '';
                    inactiveSource.srcset = '';
                } else {
                    inactiveImg.src = mediaUrl;
                    inactiveImg.srcset = '';
                    inactiveSource.srcset = '';
                    inactiveVideo.src = '';
                }
            };

            const applyDefault = () => {
                inactiveImg.style.display = 'block';
                inactiveVideo.style.display = 'none';
                inactiveVideo.src = '';

                const onMediaReady = () => {
                    transitionToInactive();
                    inactiveImg.removeEventListener('load', onMediaReady);
                    inactiveImg.removeEventListener('error', onMediaReady);

                    if (this.settings.get('autoContrast') && Aurora.ContrastEngine) {
                        Aurora.ContrastEngine.analyze(inactiveImg);
                    }
                };

                inactiveImg.addEventListener('load', onMediaReady, { once: true });
                inactiveImg.addEventListener('error', onMediaReady, { once: true });

                inactiveImg.src = Aurora.URLS.DEFAULT_IMG_SRC;
                inactiveImg.srcset = Aurora.URLS.DEFAULT_WEBP_SRCSET;
                inactiveSource.srcset = Aurora.URLS.DEFAULT_WEBP_SRCSET;
            };

            if (url) {
                if (url === '__local__') {
                    const result = await Aurora.getStorageLocal([Aurora.STORAGE_KEYS.LOCAL_BG]);
                    if (result && result[Aurora.STORAGE_KEYS.LOCAL_BG]) {
                        applyMedia(result[Aurora.STORAGE_KEYS.LOCAL_BG]);
                    } else {
                        applyDefault();
                    }
                } else {
                    applyMedia(url);
                }
            } else {
                applyDefault();
            }
        }

        /**
         * Show background
         */
        show() {
            if (!this.bgNode) {
                this.init();
            } else {
                this.bgNode.classList.add('bg-visible');
                this.updateImage();
            }
        }

        /**
         * Hide background
         */
        hide() {
            if (this.bgNode) {
                this.bgNode.classList.remove('bg-visible');
            }
        }

        /**
         * Update styles (when blur/scaling changes)
         */
        refreshStyles() {
            this._applyCustomStyles();
        }

        /**
         * Get current active image
         * @returns {HTMLImageElement|null}
         */
        getActiveImage() {
            if (!this.bgNode) return null;
            return this.bgNode.querySelector('.media-layer.active img');
        }

        /**
         * Handle video when tab visibility changes
         * @param {boolean} isHidden - Tab is hidden
         */
        handleVisibilityChange(isHidden) {
            if (!this.bgNode) return;

            const videos = this.bgNode.querySelectorAll('video');
            videos.forEach(video => {
                if (isHidden) {
                    video.pause();
                } else if (video.style.display !== 'none') {
                    video.play().catch(() => { });
                }
            });
        }

        /**
         * Destroy manager
         */
        destroy() {
            if (this.bgNode) {
                this.bgNode.remove();
                this.bgNode = null;
            }
            if (this.styleNode) {
                this.styleNode.remove();
                this.styleNode = null;
            }
        }
    }

    // Export
    Aurora.BackgroundManager = BackgroundManager;
    window.Aurora = Aurora;
})();
