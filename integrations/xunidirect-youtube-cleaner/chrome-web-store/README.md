# XuniDirect YouTube Cleaner — Chrome Web Store

Chrome Web Store item ID: `afmhdjmneddlnmfeimikfombdbmjmnjk`

Status: **Draft / OAuth binding required before review submission**.

This directory is the Git source of record for the XuniDirect Chrome Web Store release package.

## Layout

- `extension/` — Manifest V3 extension source
- `store-listing/` — listing, privacy, distribution, and reviewer-test copy
- `../../.black-house/integrations/xunidirect-youtube-cleaner.json` — Black House runtime/release contract

## Release boundary

The Chrome Web Store draft already exists. The final production package must use a Google-issued OAuth client of type **Chrome Extension** bound to store item ID `afmhdjmneddlnmfeimikfombdbmjmnjk`. Do not fabricate or commit an OAuth client secret. After the real client ID is inserted into `manifest.json`, run a clean-profile OAuth/scan/unsubscribe test before submitting for Google review.

## Architecture

`toolbar action -> chrome.identity -> YouTube Data API -> preview -> explicit human confirmation -> subscriptions.delete -> result evidence`

The extension intentionally uses the official YouTube Data API rather than page-click automation.