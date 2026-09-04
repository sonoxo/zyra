# Black House Chrome Extension Engineering Standard

**Authority:** `THE_BLACK_HOUSE_V1`  
**Applies to:** XuniDirect and future XUNIA / ZYRA Chrome extensions  
**Baseline:** Chrome Extensions Manifest V3

This standard translates the official Chrome extension development model into Black House engineering gates.

## 1. Required package structure

Every production extension MUST:

- use `manifest_version: 3`,
- place `manifest.json` at the extension package root,
- keep all executable extension logic inside the packaged extension,
- avoid remotely hosted executable JavaScript,
- declare only the permissions required for the extension's single purpose,
- use packaged icons/assets rather than remote executable dependencies.

`manifest.json` is the canonical extension contract. Black House treats a missing, malformed, or nested-away manifest as a hard package failure.

## 2. Runtime roles

Chrome extension components map into Black House roles as follows:

| Chrome component | Black House interpretation | Allowed responsibility |
| --- | --- | --- |
| Manifest | capability contract | metadata, permissions, entrypoints, OAuth declarations |
| Service worker | event runtime | background browser events, token lifecycle, orchestration without DOM access |
| Content script | page-context adapter | page-scoped DOM interaction only when required by the declared single purpose |
| Toolbar action | explicit user entrypoint | launch popup or user-confirmed command surface |
| Side panel | persistent operator surface | long-lived review/selection UI where beneficial |
| `declarativeNetRequest` | bounded network policy adapter | request filtering/modification only when required by declared purpose |

XuniDirect intentionally prefers the official YouTube Data API over content-script button clicking.

## 3. Service-worker rule

Manifest V3 background execution uses an extension service worker.

Black House requirements:

- no assumption of a permanently running background page,
- state that must survive worker suspension belongs in supported persistent storage,
- no DOM access from the service worker,
- long-running destructive loops must expose progress and recover cleanly from interruption,
- external API mutations must fail closed on auth, permission, or quota errors.

## 4. UI rule

User-visible actions should be explicit and understandable.

Approved surfaces include:

- toolbar `action` popup,
- options page,
- side panel when a larger review surface is justified,
- notification or badge state for bounded status reporting.

Consequential actions MUST NOT be hidden behind background-only execution.

For XuniDirect, unsubscribe remains:

`scan -> filter -> preview -> select -> final human confirmation -> delete`

## 5. Single-purpose gate

Every extension MUST have one narrow, easy-to-understand primary purpose.

For XuniDirect:

> Review and manage the authenticated user's own YouTube subscriptions by subscription date or channel name, with preview and explicit confirmation before unsubscribe actions.

New capabilities that materially change this purpose require a new review rather than being silently appended.

## 6. Remote-code prohibition

All executable extension logic MUST ship in the extension package.

Allowed network activity includes fetching data from declared APIs when the fetched response is treated as data.

Disallowed patterns include:

- downloading JavaScript and executing it,
- remote `eval`-style behavior,
- importing runtime executable logic from arbitrary external hosts,
- using remote configuration as an undeclared code-delivery channel.

## 7. Permission minimization

Permissions are treated as capabilities and reviewed individually.

For current XuniDirect architecture the expected minimum set is:

- `identity` — Google OAuth token flow,
- `storage` — bounded local preference/state persistence,
- host access limited to required Google API endpoints.

Any new permission requires:

1. feature justification,
2. data-flow review,
3. user-facing disclosure where applicable,
4. privacy-policy reconciliation,
5. Black House contract update.

## 8. OAuth and external APIs

OAuth scopes are external capabilities.

Black House requires:

- exact scope declaration,
- owner-scoped authorization,
- no embedded client secret in extension code,
- revoke/re-auth path,
- clear failure handling,
- no claim of Google verification or production approval without external evidence.

XuniDirect uses the YouTube Data API and `subscriptions.delete` for user-confirmed unsubscribe actions.

## 9. Debug workflow

Before a store release candidate is promoted:

1. load the unpacked extension from the actual extension folder,
2. confirm Chrome accepts the manifest,
3. inspect extension errors in `chrome://extensions`,
4. inspect service-worker logs,
5. test popup/action behavior,
6. test OAuth sign-in and token refresh/revocation,
7. test zero-result and error states,
8. test a small destructive batch before a larger batch,
9. verify the final ZIP has `manifest.json` at ZIP root,
10. test the exact ZIP contents intended for store upload.

## 10. Black House release gates

A Chrome extension is eligible for `STORE_READY` only when:

- `MANIFEST_V3_VALID`
- `MANIFEST_AT_PACKAGE_ROOT`
- `NO_REMOTE_EXECUTABLE_CODE`
- `SINGLE_PURPOSE_DECLARED`
- `PERMISSIONS_MINIMIZED`
- `SERVICE_WORKER_VALIDATED`
- `USER_CONFIRMATION_FOR_CONSEQUENTIAL_ACTIONS`
- `PRIVACY_DISCLOSURES_RECONCILED`
- `OAUTH_CLIENT_BOUND` when OAuth is used
- `CLEAN_PROFILE_TEST_PASS`
- `STORE_PACKAGE_ROOT_VALIDATED`

Store approval remains external evidence controlled by Google.

## 11. Source authority

Primary engineering source: Chrome for Developers — Chrome Extensions documentation.

Black House records public Chrome documentation as an engineering source and benchmark, not as an endorsement, certification, partnership, or privileged Google access.
