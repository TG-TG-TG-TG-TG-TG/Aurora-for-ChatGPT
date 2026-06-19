# Aurora for ChatGPT V1.7.0

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT/blob/main/LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-lightgrey.svg)](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT/pulls)

> [!NOTE]
> The extension is now fully working with the latest version of the ChatGPT website.

Bring a stunning **Glassmorphism theme**, **Privacy Suite**, and **Real-time Token Counting** to ChatGPT.
Not affiliated with OpenAI. Built for power users who want a cleaner, safer, and more personalized experience.

> **Enjoying the extension?** Please consider dropping a **Star ⭐** on this repository to show your support! It helps visibility a ton.

---

### Quick Install Guide

Clone the repo **OR** Download/Extract the zip → Navigate to `chrome://extensions` → Enable **Developer mode** → Click **Load unpacked** and select the *unpacked* project folder → Pin the extension from the puzzle icon.

---

<table align="center">
<tr>
<td width="50%">
  <img src="https://github.com/user-attachments/assets/8c67ef7c-a3e3-449c-b62d-2760f56df9c9" width="100%">
</td>
<td width="50%">
  <video src="https://github.com/user-attachments/assets/a62f3cb9-581f-4625-8c4b-103857338e23" autoplay loop muted width="100%"></video>
</td>
</tr>
</table>

---

## Highlights

*   🎨 **Unified Glass Engine** — High-performance, glitch-free glassmorphism
*   📊 **Real-Time Token Counter** — Live word count and token usage with budget warnings
*   🛡️ **Privacy Suite** — Streamer Mode (blur history/avatars) and Data Masking
*   🔊 **Audio Haptics** — Subtle UI sound effects for a tactile feel
*   🔤 **Custom Fonts** — Inter, Roboto, Montserrat, and more
*   🖼️ **Custom Backgrounds & Auto-Contrast** — Upload your own images
*   🌍 **Multi-language support** — 5 languages with intelligent detection
*   🔒 **Private** — All processing happens locally

---

## 🌍 Multi-Language Support

Aurora for ChatGPT now supports **5 languages** with intelligent language detection:

| Language | Code |
|----------|------|
| 🇬🇧 English | `en` |
| 🇪🇸 Español | `es` |
| 🇷🇺 Русский | `ru` |
| 🇫🇷 Français | `fr` |
| 🇨🇳 简体中文 | `zh_CN` |

**How it works:**
1. 🎯 **ChatGPT language priority** — Automatically detects your ChatGPT interface language
2. 🌐 **Browser language fallback** — Uses your browser's language if needed
3. 📖 **Complete localization** — All UI elements, welcome screen, and settings translated

For more details, see [LOCALIZATION.md](./LOCALIZATION.md)

---

## Install (unpacked)

1. **Download** or `git clone` this repo.
2. Open Chrome and go to `chrome://extensions`.
3. Switch **Developer mode** on (top right).
4. Click **Load unpacked** and pick the project folder.
5. Pin the extension from the puzzle icon.
6. Open ChatGPT and enjoy your **aurora glow**.

---

## Install from Chrome Web Store (coming soon)

This section will be updated once the extension is published on the Chrome Web Store.

---

## Usage

*   **Token Counter**: View live stats in the bottom widget; color changes as you near limits
*   **Privacy Controls**: Use the shield icon for Blur History, Blur Avatars, or Data Masking
*   **Customization**: Open the popup to change backgrounds, fonts, or enable Light Mode
*   **Quick Settings**: Click the gear icon on ChatGPT for fast access to common toggles

---

## Screens & Behavior

*   **Glass Engine**: Intelligently tags UI elements to apply blur without breaking layout
*   **Auto-Contrast**: Analyzes your background image to ensure text remains readable

---

## Permissions

```json
"permissions": ["storage"],
"host_permissions": [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://openai.com/*"
]
```

*   **storage** — to remember your Aurora, privacy, and theme settings.
*   **host\_permissions** — to inject the Glass Engine and Token Counter on ChatGPT pages.

**Note:** The Token Counter uses a local WASM file for `tiktoken`. No chat data is sent to any server.

---

## How it works (nerdy notes)

*   **Unified Glass Engine**: Performant `data-aurora-glass` attribute system that "heals" the UI as new elements appear
*   **WASM Token Counting**: Lightweight `tiktoken` runs directly in the browser
*   **Data Masking**: Regex patterns obfuscate sensitive data in the DOM visually
*   **Zero-Latency Toggles**: State changes apply instantly via background service worker caching

## Star History

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT&type=Date" width="500" />
  </picture>
</p>

## ❤️ Support the Project

Aurora is 100% free and open source. I built it because I wanted a cleaner, vibey, and more personalized ChatGPT experience.

However, keeping the **Glass Engine** running smoothly and constantly updating selectors to fight ChatGPT's frequent UI changes takes a lot of late nights and resources.
If you're liking the work put in the extension:

1.  **⭐ Star this Repo:** It helps more people find the project and motivates me to keep shipping cool features.
2.  **☕ Buy me a Coffee:** If you want to help me continue expanding the project or just say thanks for the aesthetic upgrade, you can support me here:
    *   [Ko-fi](https://ko-fi.com/testtm) thanks!

---

## License

**MIT** — do anything, just keep the copyright & license notice.
Branding & icons © 2025 **test\_tm7873**. All rights reserved.

---

## Credits

Made by <a href="@test\_tm7873" target="_blank">[@test\_tm7873](https://twitter.com/test_tm7873)</a> on X.
Thanks to everyone who likes their AI chats… just a bit more magical. ✨
And many thanks to <a href="@tnemoroccan" target="_blank">[@tnemoroccan](https://x.com/tnemoroccan)</a> on X for adding more blur elements, custom backgrounds! 🎄
