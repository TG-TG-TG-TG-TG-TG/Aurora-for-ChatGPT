# Privacy Policy for Aurora for Gemini

**Last Updated:** January 27, 2026

## Introduction
Aurora for Gemini ("we", "our", or "the extension") is a Chrome extension designed to enhance the visual experience of the Google Gemini web interface. We are committed to protecting your privacy. This Privacy Policy explains how we handle your data.

## Data Collection and Usage

**We do not collect, store, or sell your personal data, browsing history, or chat content.**

The extension operates almost entirely locally on your device. We believe that your conversations with AI should remain private.

### 1. Local Storage
We use your browser's local storage (`chrome.storage.local` and `chrome.storage.sync`) solely to save your visual preferences, such as:
*   Selected theme and background settings.
*   Feature toggles (e.g., "Holiday Mode", "Focus Mode").
*   Custom configuration options.

This data never leaves your browser and is not transmitted to us or any third parties, except for the automatic synchronization provided by Google Chrome's built-in sync feature if you have it enabled.

### 2. Patreon Authentication
To unlock premium features, you may choose to verify your supporter status via Patreon.
*   **What we send:** If you initiate the login process, we send a temporary authorization code to our verify server (`aurora-patreon-proxy.vercel.app`) to confirm your membership tier.
*   **What we receive:** We receive a "verified" status (true/false).
*   **What we do NOT see:** We never have access to your Patreon password, billing information, or full profile details.

### 3. Data Masking
The "Data Masking" feature runs 100% locally within your browser. It uses pattern recognition to visually obscure sensitive information (like emails or phone numbers) on your screen. This processed data is not collected or sent anywhere.

## Permissions

*   **`storage`**: Used to save your settings.
*   **`identity`**: Used *only* for the optional Patreon OAuth2 authentication flow.
*   **`scripting`** / **Host Permissions**: Used to inject the visual styles (CSS) and functionality (JS) into the Gemini website (`gemini.google.com`) to apply the theme.

## Third-Party Services
The extension interacts with the following third-party services only for specific functionality:
*   **Google Gemini**: The extension functions on top of the Google Gemini website. We do not control Google's data collection practices.
*   **Patreon**: Used for optional account verification.

## Contact Us
If you have any questions about this Privacy Policy, please contact us via the Chrome Web Store support tab.
