# XuniDirect Chrome Web Store Submission Record

**Store item ID:** `afmhdjmneddlnmfeimikfombdbmjmnjk`  
**Dashboard state:** Draft  
**Category:** Tools  
**Language:** English (United States)  
**Mature content:** No

## Single purpose

Review and manage the signed-in user's own YouTube subscriptions by subscription date or channel name, with preview and explicit confirmation before unsubscribe actions.

## Homepage

https://github.com/sonoxo/zyra/tree/main/integrations/xunidirect-youtube-cleaner

## Support

https://github.com/sonoxo/zyra/blob/main/integrations/xunidirect-youtube-cleaner/SUPPORT.md

## Privacy policy

https://github.com/sonoxo/zyra/blob/main/integrations/xunidirect-youtube-cleaner/PRIVACY.md

## Distribution target

- Visibility: Public
- Regions: All regions unless publisher intentionally restricts distribution
- Pricing: Free
- Item support: On

## Permission justifications

### `identity`
Required to authenticate the user through Google's Chrome Identity/OAuth flow and obtain authorization to call the YouTube Data API on the signed-in user's behalf.

### `storage`
Used only for local extension preferences and lightweight interface state such as date filters and channel-name filters.

### `https://www.googleapis.com/*`
Required to call Google API endpoints used by the YouTube Data API. XuniDirect does not use this permission to read arbitrary website pages.

## Remote code

None. XuniDirect packages all executable Manifest V3 extension logic locally and does not download or execute remote JavaScript.

## Current external gate

The Chrome Web Store draft now exists. Before the production package can be considered runtime-complete for review, the publisher must bind a Google OAuth client of application type **Chrome Extension** to Store Item ID `afmhdjmneddlnmfeimikfombdbmjmnjk` and place the issued OAuth Client ID in the extension manifest.

Google review/approval remains external evidence and is not inferred from this repository record.
