# Aurora-for-ChatGPT V1.5.4

Bring a **soft, ambient, blurred glow** behind the ChatGPT UI — plus a **chat visibility toggle** and a **legacy composer** option.
Not affiliated with OpenAI. Just here to make ChatGPT feel a little cozier.

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/8c67ef7c-a3e3-449c-b62d-2760f56df9c9" width="70%">
</p>


---

## Highlights

* 🌌 **Ambient Aurora background** — a subtle gradient blur behind the ChatGPT interface
* 🖼️ **Custom Backgrounds** — Choose from built-in presets, paste an image URL, or upload your own file.
* 👁️ **Chat visibility toggle** — hide/show the chat panel instantly
* 📝 **Legacy composer option** — switch back to the classic `<textarea>` input instead of the new Lexical composer
* 🌗 **Light mode** — optional light themed variant with quick toggle
* 🪄 **Seamless integration** — blends into the UI without breaking layouts or controls
* 🔒 **Private** — no network calls, no analytics; settings sync via Chrome’s `storage.sync`

---

## Install (unpacked)

These steps match the Chrome “Hello World” flow you’re used to.

1. **Download** or `git clone` this repo.
2. Open Chrome and go to `chrome://extensions`.
3. Switch **Developer mode** on (top right).
4. Click **Load unpacked** and pick the project folder.
5. Pin the extension from the puzzle icon so its toolbar button shows.
6. Open ChatGPT and enjoy your **aurora glow**.

Similar to this tutorial "https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=en"

---

## Install from Chrome Web Store (coming soon)

This section will be updated once the extension is published on the Chrome Web Store.

---

## Usage

* **Toggle Aurora background**: via the toolbar popup or the in-page controls.
* **Switch composers**: enable **Legacy composer** from the popup or settings.
* **Light mode**: flip the "Light mode" toggle in the popup for a brighter vibe.
* **Settings sync**: changes persist between sessions automatically.

---

## Screens & Behavior

* **Aurora effect** always runs when enabled — background softly animates without affecting performance.
* **Legacy composer** replaces the Lexical editor with a plain `<textarea>` for simpler, faster typing.

---

## Permissions

```json
"permissions": ["storage"],
"host_permissions": [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*"
  "https://openai.com/*"
]
```

* **storage** — to remember your Aurora, chat toggle, and composer settings
* **host\_permissions** — to run only on ChatGPT pages

No data leaves your machine.

---

## How it works (nerdy notes)

* Injects a **CSS-based blurred gradient** layer behind the main ChatGPT container.
* Adds **toggle controls** that interact directly with ChatGPT’s DOM without modifying its core scripts.
* Legacy composer mode swaps out the Lexical `contenteditable` for a `<textarea>` fallback — with proper event hooks for sending messages.
* All toggles update instantly with minimal DOM mutation for performance safety.

---

## License

**MIT** — do anything, just keep the copyright & license notice.
Branding & icons © 2025 **test\_tm7873**. All rights reserved.

---

## Credits

Made by **@test\_tm7873** on X.
Thanks to everyone who likes their AI chats… just a bit more magical. ✨

---
