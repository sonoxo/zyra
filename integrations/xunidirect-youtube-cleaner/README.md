# XuniDirect YouTube Cleaner

**Black House integration class:** human-confirmed, owner-scoped browser action tool.

XuniDirect manages the authenticated user's own YouTube subscriptions through the official YouTube Data API. It does not depend on page-click automation and does not scrape the YouTube subscriptions page.

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
- Canonical control plane: `THE_BLACK_HOUSE_V1`
- ZYRA role: security / approval / audit boundary around external execution

## Chrome Web Store publication state

Current state: **NOT_YET_PUBLISHED**.

Before public release, the extension must have:

1. a Chrome Web Store developer account with 2-Step Verification,
2. a production-ready Manifest V3 package,
3. a Chrome Extension OAuth client bound to the final extension ID,
4. an OAuth consent screen prepared for production verification where required,
5. an accurate privacy policy and Limited Use disclosure,
6. completed Chrome Web Store Store Listing and Privacy tabs,
7. a review submission through the Chrome Web Store Developer Dashboard.

See `docs/XUNIDIRECT_CHROME_STORE_RELEASE.md` for the publication checklist.
