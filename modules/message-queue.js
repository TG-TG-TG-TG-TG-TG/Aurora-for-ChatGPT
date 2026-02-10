// modules/message-queue.js
// Queue messages while the model is generating, then auto-send them when it finishes.
(() => {
  'use strict';

  const COMPOSER_SELECTORS = [
    '#prompt-textarea',
    'textarea[id*="prompt"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Send"]',
    'textarea[data-id]',
    '[contenteditable="true"][role="textbox"]',
    'form textarea',
    'textarea',
  ];

  function isLikelyVisible(el) {
    if (!el || !el.isConnected) return false;
    if ('disabled' in el && el.disabled) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect) return false;
    return rect.width >= 20 && rect.height >= 16;
  }

  class AuroraComposerLocator {
    static findFromTarget(target) {
      if (!target || target.nodeType !== 1) return null;

      const t = target;
      if (t.id === 'prompt-textarea' && isLikelyVisible(t)) return t;
      if ((t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') && isLikelyVisible(t)) return t;

      const ce = t.closest?.('[contenteditable="true"][role="textbox"]');
      if (ce && isLikelyVisible(ce)) return ce;

      return null;
    }

    static findActive() {
      for (const selector of COMPOSER_SELECTORS) {
        const candidates = document.querySelectorAll(selector);
        for (const el of candidates) {
          if (isLikelyVisible(el)) return el;
        }
      }
      return null;
    }

    static getForm(composer) {
      return composer?.closest?.('form') || null;
    }

    static getText(composer) {
      if (!composer) return '';
      if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') return composer.value || '';
      return composer.innerText || composer.textContent || '';
    }

    static setText(composer, value) {
      if (!composer) return;
      const v = value == null ? '' : String(value);

      if (composer.tagName === 'TEXTAREA') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(composer, v);
        else composer.value = v;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (composer.tagName === 'INPUT') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(composer, v);
        else composer.value = v;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // contenteditable textbox (ProseMirror-like)
      try {
        composer.focus();
      } catch (e) {
        // ignore
      }

      try {
        const selection = window.getSelection?.();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(composer);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        if (v === '') {
          const ok = !!(document.execCommand && document.execCommand('delete', false, null));
          if (!ok) composer.textContent = '';
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }

        const ok = !!(document.execCommand && document.execCommand('insertText', false, v));
        if (!ok) composer.textContent = v;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {
        composer.textContent = v;
        composer.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  class AuroraMessageQueueUI {
    constructor({ getMessage }) {
      this.getMessage = getMessage;
      this.toastTimer = null;
    }

    removeAll() {
      document.getElementById('aurora-queue-btn')?.remove();
      document.getElementById('aurora-queue-panel')?.remove();
      document.getElementById('aurora-queue-toast')?.remove();
    }

    updateBadge(count) {
      const btn = document.getElementById('aurora-queue-btn');
      if (!btn) return;
      const badge = btn.querySelector('.aurora-queue-count');
      if (!badge) return;
      badge.textContent = count > 0 ? String(Math.min(count, 99)) : '';
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    ensureButton({ anchor, count, onClick, visible }) {
      const BTN_ID = 'aurora-queue-btn';

      if (!visible) {
        document.getElementById(BTN_ID)?.remove();
        return;
      }

      if (!anchor || !anchor.parentElement) {
        document.getElementById(BTN_ID)?.remove();
        return;
      }

      let btn = document.getElementById(BTN_ID);
      if (!btn) {
        btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.className = 'aurora-queue-btn';
        const title = this.getMessage('queueButtonTitle');
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 8a1 1 0 0 1 1 1v3.59l2.3 2.3a1 1 0 1 1-1.42 1.42l-2.6-2.6A1 1 0 0 1 11 13V9a1 1 0 0 1 1-1Zm0-6a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8.01 8.01 0 0 1-8 8Z"/>
          </svg>
          <span class="aurora-queue-count" aria-hidden="true"></span>
        `;
        btn.addEventListener('click', onClick);
      }

      // Keep it next to the current anchor (ChatGPT re-renders composer often).
      anchor.parentElement.insertBefore(btn, anchor.nextSibling);
      this.updateBadge(count);
    }

    ensurePanel({ composer, queue, pending, generating, onRemove }) {
      const PANEL_ID = 'aurora-queue-panel';
      const shouldShow = (queue.length > 0) || !!pending;
      if (!shouldShow || !document.body) {
        document.getElementById(PANEL_ID)?.remove();
        return;
      }

      let panel = document.getElementById(PANEL_ID);
      if (!panel) {
        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'aurora-queue-panel';
        panel.setAttribute('data-aurora-glass', 'true');
        panel.innerHTML = `
          <div class="aurora-queue-panel-header">
            <div class="aurora-queue-panel-titles">
              <div class="aurora-queue-panel-title"></div>
              <div class="aurora-queue-panel-subtitle"></div>
            </div>
          </div>
          <ol class="aurora-queue-list" aria-label=""></ol>
        `;
        document.body.appendChild(panel);
      }

      // Position the panel just above the composer.
      try {
        const rect = composer.getBoundingClientRect();
        const maxW = Math.max(240, Math.round(window.innerWidth - 16));
        const width = Math.min(maxW, Math.max(240, Math.round(rect.width)));
        const rawLeft = Math.round(rect.left);
        const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
        const bottom = Math.max(8, Math.round(window.innerHeight - rect.top + 10));
        panel.style.left = `${left}px`;
        panel.style.width = `${width}px`;
        panel.style.bottom = `${bottom}px`;
      } catch (e) {
        // ignore
      }

      const title = panel.querySelector('.aurora-queue-panel-title');
      const subtitle = panel.querySelector('.aurora-queue-panel-subtitle');
      const list = panel.querySelector('.aurora-queue-list');
      if (!title || !subtitle || !list) return;

      title.textContent = `${this.getMessage('queuedPanelTitle')} (${queue.length})`;
      subtitle.textContent = generating ? this.getMessage('queuedPanelSubtitleGenerating') : this.getMessage('queuedPanelSubtitleIdle');
      list.setAttribute('aria-label', this.getMessage('queuedPanelTitle'));

      list.innerHTML = '';
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        const li = document.createElement('li');
        li.className = 'aurora-queue-item';

        const num = document.createElement('div');
        num.className = 'aurora-queue-item-num';
        num.textContent = String(i + 1);

        const main = document.createElement('div');
        main.className = 'aurora-queue-item-main';

        const meta = document.createElement('div');
        meta.className = 'aurora-queue-item-meta';

        const time = document.createElement('div');
        time.className = 'aurora-queue-item-time';
        time.textContent = item.timeLabel || String(item.at || '');
        time.title = time.textContent;

        meta.appendChild(time);

        const text = document.createElement('div');
        text.className = 'aurora-queue-item-text';
        const compact = (item.text || '').replace(/\s+/g, ' ').trim();
        text.textContent = compact;
        text.title = item.text || '';

        main.appendChild(meta);
        main.appendChild(text);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'aurora-queue-remove';
        remove.title = this.getMessage('queuedPanelRemove');
        remove.setAttribute('aria-label', this.getMessage('queuedPanelRemove'));
        remove.textContent = '×';
        remove.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(i);
        });

        li.appendChild(num);
        li.appendChild(main);
        li.appendChild(remove);
        list.appendChild(li);
      }
    }

    showToast(text) {
      if (!text || !document.body) return;
      const TOAST_ID = 'aurora-queue-toast';

      let toast = document.getElementById(TOAST_ID);
      if (!toast) {
        toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.className = 'aurora-queue-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.classList.add('show');

      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        toast?.classList?.remove('show');
      }, 1400);
    }
  }

  class AuroraMessageQueueEngine {
    constructor({ getSettings, isExtensionEnabled, getMessage }) {
      this.getSettings = getSettings;
      this.isExtensionEnabled = isExtensionEnabled;
      this.getMessage = getMessage;

      this.queue = []; // [{ text, href, at, timeLabel }]
      this.pending = null; // { attemptedAt, text, draft, href }
      this.lastHref = location.href;

      this.ui = new AuroraMessageQueueUI({ getMessage });

      this.pulseTimeout = null;
      this.pulseDue = 0;
      this.lastPulseAt = 0;

      this.onKeydown = (e) => this.handleKeydown(e);
      document.addEventListener('keydown', this.onKeydown, true);
    }

    isEnabled() {
      const s = this.getSettings?.() || {};
      return this.isExtensionEnabled?.() && !!s.queueWhileGenerating;
    }

    hasWork() {
      return !!this.pending || (this.queue && this.queue.length > 0);
    }

    shutdown() {
      // Keep the keydown listener (cheap) so re-enable works without re-instantiation.
      this.queue = [];
      this.pending = null;
      this.ui.removeAll();
      if (this.pulseTimeout) {
        clearTimeout(this.pulseTimeout);
        this.pulseTimeout = null;
      }
      this.pulseDue = 0;
    }

    schedulePulse(delay = 0) {
      if (!this.isExtensionEnabled?.()) return;

      const MIN_GAP_MS = 220; // throttle: ChatGPT mutates DOM constantly during generation
      const now = Date.now();
      const earliest = now + Math.max(0, delay);
      const due = Math.max(earliest, (this.lastPulseAt || 0) + MIN_GAP_MS);

      if (this.pulseTimeout && this.pulseDue <= due) return;
      if (this.pulseTimeout) clearTimeout(this.pulseTimeout);

      this.pulseDue = due;
      this.pulseTimeout = setTimeout(() => {
        this.pulseTimeout = null;
        this.pulseDue = 0;
        this.pulse();
      }, Math.max(0, due - now));
    }

    pulse() {
      this.lastPulseAt = Date.now();

      // Safety: never auto-send a queued message into a different chat.
      if (this.lastHref !== location.href) {
        this.lastHref = location.href;
        this.queue = [];
        this.pending = null;
        this.ui.removeAll();
      }

      if (!this.isExtensionEnabled?.()) {
        this.shutdown();
        return;
      }

      // If feature is off and there is no queued work, do nothing (and remove UI).
      if (!this.isEnabled() && !this.hasWork()) {
        this.ui.removeAll();
        return;
      }

      // Cheap idle fast-path: no queue, no pending, no Stop button => nothing to update.
      if (!this.hasWork()) {
        const stopBtn = this.findStopButton(null);
        if (!stopBtn) {
          this.ui.removeAll();
          return;
        }
      }

      const composer = AuroraComposerLocator.findActive();
      if (!composer) return;

      const form = AuroraComposerLocator.getForm(composer);
      const stopBtn = this.findStopButton(form);
      const generating = !!stopBtn;
      const sendBtn = generating ? null : this.findSendButton(form);

      this.ui.ensureButton({
        anchor: stopBtn || sendBtn,
        count: this.queue.length,
        visible: generating || this.queue.length > 0 || !!this.pending,
        onClick: () => {
          if (!this.isEnabled()) return;
          const c = AuroraComposerLocator.findActive();
          if (!c) return;
          const ok = this.enqueueFromComposer(c);
          if (ok) this.ui.showToast(this.getMessage('toastMessageQueued', String(this.queue.length)));
        }
      });

      this.ui.ensurePanel({
        composer,
        queue: this.queue,
        pending: this.pending,
        generating,
        onRemove: (idx) => {
          this.queue.splice(idx, 1);
          this.ui.updateBadge(this.queue.length);
          this.schedulePulse(0);
        }
      });

      // Pending send confirmation.
      if (this.pending) {
        if (this.pending.href !== location.href) {
          this.restoreDraftIfSafe(composer, this.pending.draft, this.pending.text);
          this.pending = null;
        } else if (generating) {
          // Confirmed: generation started => we can drop the queued item.
          if (this.queue.length && this.queue[0].href === this.pending.href && this.queue[0].text === this.pending.text) {
            this.queue.shift();
          } else {
            this.queue.shift();
          }
          this.ui.updateBadge(this.queue.length);
          this.restoreDraftIfSafe(composer, this.pending.draft, this.pending.text);
          this.pending = null;
        } else if (Date.now() - this.pending.attemptedAt > 2600) {
          // Failed to start; restore draft and try later.
          this.restoreDraftIfSafe(composer, this.pending.draft, this.pending.text);
          this.pending = null;
          this.ui.updateBadge(this.queue.length);
        }
      }

      // Idle and queue has work: attempt to send next.
      if (!generating && !this.pending && this.queue.length) {
        this.maybeStartAutoSend(composer, sendBtn);
      }
    }

    handleKeydown(e) {
      if (!this.isEnabled()) return;
      if (e.isComposing) return;
      if (e.key !== 'Enter') return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

      const composerFromTarget = AuroraComposerLocator.findFromTarget(e.target) || AuroraComposerLocator.findActive();
      if (!composerFromTarget) return;
      const t = e.target;
      if (t !== composerFromTarget && !(composerFromTarget.contains && composerFromTarget.contains(t))) return;

      const form = AuroraComposerLocator.getForm(composerFromTarget);
      const generating = !!this.findStopButton(form);
      if (!generating) return;

      // While generating, Enter becomes "Queue" (Shift+Enter still inserts newline).
      e.preventDefault();
      e.stopPropagation();

      const ok = this.enqueueFromComposer(composerFromTarget);
      if (ok) this.ui.showToast(this.getMessage('toastMessageQueued', String(this.queue.length)));
    }

    enqueueFromComposer(composer) {
      const raw = AuroraComposerLocator.getText(composer);
      const text = (raw || '').trim();
      if (!text) return false;

      const at = Date.now();
      let timeLabel = '';
      try {
        timeLabel = new Date(at).toLocaleString();
      } catch (e) {
        timeLabel = String(at);
      }

      this.queue.push({ text, href: location.href, at, timeLabel });
      AuroraComposerLocator.setText(composer, '');
      this.ui.updateBadge(this.queue.length);
      this.schedulePulse(0);
      return true;
    }

    maybeStartAutoSend(composer, sendBtnHint) {
      const next = this.queue[0];
      if (!next) return;

      if (next.href !== location.href) {
        this.queue = [];
        this.pending = null;
        this.ui.updateBadge(this.queue.length);
        this.ui.removeAll();
        return;
      }

      const draft = AuroraComposerLocator.getText(composer);
      AuroraComposerLocator.setText(composer, next.text);

      const attemptSend = () => {
        if (!this.isEnabled()) return;

        const cNow = AuroraComposerLocator.findActive() || composer;
        if (!cNow || !cNow.isConnected) return;

        const formNow = AuroraComposerLocator.getForm(cNow);
        const hintedBtn = (sendBtnHint && sendBtnHint.isConnected) ? sendBtnHint : null;
        const btnNow = (!hintedBtn || hintedBtn.disabled) ? this.findSendButton(formNow) : hintedBtn;
        if (btnNow && !btnNow.disabled) {
          btnNow.click();
          this.pending = { attemptedAt: Date.now(), text: next.text, draft, href: next.href };
          this.schedulePulse(120);
          return;
        }

        // Fallback: some ChatGPT UIs don't mount the Send button until after input.
        // Try submitting the form if available.
        if (formNow && typeof formNow.requestSubmit === 'function') {
          try {
            formNow.requestSubmit();
            this.pending = { attemptedAt: Date.now(), text: next.text, draft, href: next.href };
            this.schedulePulse(120);
            return;
          } catch (e) {
            // ignore
          }
        }

        // Last resort: restore draft and retry later (keeps user's typing safe).
        this.restoreDraftIfSafe(cNow, draft, next.text);
        this.schedulePulse(300);
      };

      // Try twice: React can mount/enable Send slightly after the input event.
      requestAnimationFrame(() => {
        attemptSend();
        if (!this.pending) setTimeout(attemptSend, 140);
      });
    }

    restoreDraftIfSafe(composer, draft, sentText) {
      const cur = (AuroraComposerLocator.getText(composer) || '').trim();
      if (!cur || cur === (sentText || '').trim()) {
        AuroraComposerLocator.setText(composer, draft == null ? '' : String(draft));
      }
    }

    findStopButton(form) {
      const roots = form ? [form, form.parentElement].filter(Boolean) : [];
      const selectors = [
        'button[data-testid="stop-button"]',
        'button[data-testid="stop"]',
        'button[data-testid*="stop-button"]',
        'button[data-testid*="stop-generating"]',
        'button[data-testid*="stop"]',
      ];

      for (const root of roots) {
        for (const sel of selectors) {
          const hit = root.querySelector(sel);
          if (hit) return hit;
        }
        // aria-label fallback (local scope only)
        const ariaBtns = root.querySelectorAll('button[aria-label],button[title]');
        for (const btn of ariaBtns) {
          const label = ((btn.getAttribute('aria-label') || btn.getAttribute('title') || '') + '').toLowerCase();
          if (label.includes('stop') || label.includes('останов')) return btn;
        }
      }

      for (const sel of selectors) {
        const hit = document.querySelector(sel);
        if (hit) return hit;
      }
      return null;
    }

    findSendButton(form) {
      const roots = form ? [form, form.parentElement].filter(Boolean) : [];
      const localSelectors = [
        'button[data-testid="send-button"]',
        'button[data-testid*="send-button"]',
        'button[type="submit"]',
        'button[data-testid*="send"]',
      ];

      for (const root of roots) {
        for (const sel of localSelectors) {
          const hit = root.querySelector(sel);
          if (hit) return hit;
        }
        const ariaBtns = root.querySelectorAll('button[aria-label],button[title]');
        for (const btn of ariaBtns) {
          const label = ((btn.getAttribute('aria-label') || btn.getAttribute('title') || '') + '').toLowerCase();
          if (label.includes('send') || label.includes('отправ')) return btn;
        }
      }

      const globalSelectors = [
        'button[data-testid="send-button"]',
        'button[data-testid*="send-button"]',
        'button[data-testid*="send"]',
      ];
      for (const sel of globalSelectors) {
        const hit = document.querySelector(sel);
        if (hit) return hit;
      }

      // Global aria-label fallback (localized UIs may not use testids consistently).
      const ariaBtns = document.querySelectorAll('button[aria-label],button[title]');
      for (const btn of ariaBtns) {
        const label = ((btn.getAttribute('aria-label') || btn.getAttribute('title') || '') + '').toLowerCase();
        if (label.includes('send') || label.includes('отправ')) return btn;
      }
      return null;
    }
  }

  // Export for content.js orchestrator.
  window.AuroraMessageQueueEngine = AuroraMessageQueueEngine;
})();
