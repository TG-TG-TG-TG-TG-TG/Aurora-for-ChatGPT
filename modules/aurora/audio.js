// modules/aurora/audio.js
// Optional synthesized UI sounds.
(() => {
  'use strict';

  const A = (window.AuroraExt = window.AuroraExt || {});
  A.audio = A.audio || {};

  const isEnabled = () => (A.isEnabled ? A.isEnabled() : true);
  const getSettings = () => (A.getSettings ? A.getSettings() : {});

  const AudioEngine = {
    ctx: null,
    isListening: false,
    onMouseEnter: null,
    onClick: null,

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        this.ctx = new AudioContext();
      } catch (e) {
        this.ctx = null;
      }
    },

    play(type) {
      const s = getSettings();
      if (!isEnabled() || !s.soundEnabled || !this.ctx) return;
      if (this.ctx.state === 'suspended') {
        try {
          this.ctx.resume();
        } catch (e) {
          // ignore
        }
      }

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const vol = s.soundVolume === 'high' ? 0.1 : s.soundVolume === 'medium' ? 0.05 : 0.02;

      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.01);
        gain.gain.linearRampToValueAtTime(0, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.06);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      } else if (type === 'toggle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    },

    attachListeners() {
      const s = getSettings();
      if (!isEnabled() || !s.soundEnabled || this.isListening) return;
      if (!document.body) return;

      this.isListening = true;

      this.onMouseEnter = (e) => {
        const t = e.target;
        if (t && t.matches && t.matches('button, a, [role="button"], input, .btn')) {
          this.play('hover');
        }
      };
      this.onClick = () => {
        this.play('click');
      };

      // Capture phase to catch all.
      document.body.addEventListener('mouseenter', this.onMouseEnter, true);
      document.body.addEventListener('click', this.onClick, true);
    },

    detachListeners() {
      if (!this.isListening) return;
      this.isListening = false;
      if (document.body && this.onMouseEnter) {
        document.body.removeEventListener('mouseenter', this.onMouseEnter, true);
      }
      if (document.body && this.onClick) {
        document.body.removeEventListener('click', this.onClick, true);
      }
      this.onMouseEnter = null;
      this.onClick = null;
    },
  };

  A.audio.ensureContext = A.audio.ensureContext || (() => AudioEngine.init());
  A.audio.attachIfEnabled = A.audio.attachIfEnabled || (() => AudioEngine.attachListeners());
  A.audio.detach = A.audio.detach || (() => AudioEngine.detachListeners());
})();

