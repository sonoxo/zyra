# XuniDirect YouTube Cleaner

**Black House integration class:** human-confirmed, owner-scoped browser action tool.

XuniDirect manages the authenticated user's own YouTube subscriptions through the official YouTube Data API. It does not depend on page-click automation and does not scrape the YouTube subscriptions page.

## Chrome developer baseline

XuniDirect now inherits the Black House Chrome Extension Engineering Standard:

- `docs/BLACK_HOUSE_CHROME_EXTENSION_ENGINEERING_STANDARD.md`
- source record: `.black-house/intel/chrome-extension-developer-baseline-2026-09-04.json`

The baseline is derived from first-party Chrome for Developers documentation and formalizes Manifest V3 packaging, service-worker behavior, UI surfaces, single-purpose discipline, permission minimization, no remote executable code, debugging, and store-release gates.

## Black House role

```text
MISSION
  ↓
POLICY
  ↓
OWNER AUTHENTICATION
  ↓
SUBSCRIPTION DISCOVERY + FILTERING
  ↓
SELECTION PREVIEW
  ↓
HUMAN APPROVAL
  ↓
YOUTUBE DATA API EXECUTION
  ↓
RESULT + AUDIT EVIDENCE
```

The tool is intentionally fail-closed for consequential mutations. Bulk unsubscribe is not an autonomous Black House action: the user must see the candidate set and explicitly confirm before deletion begins.

## Verified capability

The underlying API workflow has been locally exercised successfully against an authenticated YouTube account. Repository registration does not claim Chrome Web Store publication or Google OAuth production verification.

## Capabilities

- list the authenticated user's subscriptions
- read subscription creation timestamps
- filter before/after a date
- filter by channel name
- preview matched channels
- select or deselect individual channels
- unsubscribe selected channels through `subscriptions.delete`
- stop on auth or quota errors
- emit deletion counts and failure evidence

## Extension architecture

Current architectural intent:

- Manifest V3
- `manifest.json` at extension root
- toolbar `action` popup as the explicit operator entrypoint
- service worker for background/event lifecycle where required
- `chrome.identity` for OAuth
- bounded local `storage` for preferences/state
- no content script required for unsubscribe execution because the YouTube Data API is the authoritative action path
- no remotely hosted executable code

A side panel can be added later if the larger persistent review surface materially improves the same single purpose; it is not required for the initial release.

## Security / privacy boundary

- user-owned account only
- OAuth 2.0 authorization required
- explicit confirmation before destructive execution
- no browser-history collection
- no background surveillance
- no remote code execution
- no third-party account targeting
- no sale or advertising use of Google user data

## Black House contracts

- Integration contract: `.black-house/integrations/xunidirect-youtube-cleaner.json`
- Ontology: `shared/ontology/xunidirect-youtube-cleaner.yaml`
- Chrome engineering standard: `docs/BLACK_HOUSE_CHROME_EXTENSION_ENGINEERING_STANDARD.md`
- Canonical control plane: `THE_BLACK_HOUSE_V1`
- ZYRA role: security / approval / audit boundary around external execution

## Chrome Web Store publication state

Current state: **NOT_YET_PUBLISHED**.

Before public release, the extension must have:

1. a Chrome Web Store developer account with 2-Step Verification,
2. a production-ready Manifest V3 package,
3. `manifest.json` at the package/ZIP root,
4. all executable extension logic included in the package,
5. a Chrome Extension OAuth client bound to the final extension ID,
6. an OAuth consent screen prepared for production verification where required,
7. an accurate privacy policy and Limited Use disclosure,
8. completed Chrome Web Store Store Listing and Privacy tabs,
9. a clean-profile install/runtime test,
10. a review submission through the Chrome Web Store Developer Dashboard.

See `docs/XUNIDIRECT_CHROME_STORE_RELEASE.md` for the publication checklist.
