# XuniDirect Chrome Web Store Release Checklist

This checklist separates repository readiness from external Google approvals and now inherits the Black House Chrome Extension Engineering Standard.

Canonical engineering standard:

- `docs/BLACK_HOUSE_CHROME_EXTENSION_ENGINEERING_STANDARD.md`

First-party Chrome source record:

- `.black-house/intel/chrome-extension-developer-baseline-2026-09-04.json`

## 1. Developer account

- Sign in to the Chrome Web Store Developer Dashboard.
- Register as a Chrome Web Store developer and complete the one-time registration fee.
- Enable 2-Step Verification on the publishing Google account.
- Use a monitored developer/support email.

## 2. Final extension package

- Manifest V3 only.
- `manifest.json` MUST be in the extension root and at the ZIP root.
- Remove development placeholders.
- Bind the final Chrome Extension OAuth client ID in `manifest.json`.
- Keep permissions minimal: `identity`, `storage`, and only required Google API host permissions.
- Use an extension service worker for background/event execution where needed.
- Keep consequential action UI explicit through the toolbar action/popup or another approved visible surface.
- No remotely hosted executable code.
- All executable extension logic must ship in the package.
- Include production icons and store graphics.
- Test the exact final package, not only a development directory.

## 3. Chrome architecture validation

Before upload, verify:

- Chrome loads the unpacked extension without manifest errors.
- the Action popup opens correctly,
- service-worker logs are clean,
- OAuth connect/revoke/re-auth works,
- subscription discovery works without DOM scraping,
- zero-match states render correctly,
- destructive execution requires final human confirmation,
- auth and quota failures stop safely,
- no undeclared content script or host permission is present,
- no remote JavaScript is fetched or executed.

## 4. Single-purpose review

Store purpose:

> XuniDirect helps users review and manage their own YouTube subscriptions by subscription date or channel name, with preview and explicit confirmation before unsubscribe actions.

Do not add unrelated browser utilities, scraping, tracking, advertising, or generic automation to the initial store item.

## 5. Google OAuth production readiness

XuniDirect uses YouTube account data and a scope that can modify the authenticated user's YouTube state. Public production use may require Google OAuth verification.

Prepare:

- OAuth consent screen with the same product name used in the store listing.
- Homepage and privacy-policy URLs under a domain controlled by the publisher.
- Data Access entries matching the exact requested YouTube scope.
- Test-user flow while the app remains in testing.
- Verification submission when Google marks the requested scope as sensitive/restricted for production use.
- An end-to-end demo video if requested by Google showing OAuth consent and the feature using the scope.

## 6. Privacy policy / Limited Use

The public privacy policy should state, accurately:

- what YouTube data is accessed,
- why it is accessed,
- whether anything is stored locally,
- whether anything is sent to a developer-controlled server,
- retention/deletion behavior,
- that user data is not sold or used for personalized advertising,
- that the extension's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

For the current local-first design, the intended disclosure is that subscription metadata is used only to render/filter the user's subscription-management UI and to execute user-confirmed unsubscribe actions through Google APIs.

## 7. Chrome Web Store listing

In the Developer Dashboard:

- Add new item.
- Upload the production ZIP.
- Complete Store Listing:
  - name: `XuniDirect YouTube Cleaner`
  - single purpose: manage the signed-in user's own YouTube subscriptions by date/name with explicit preview and confirmation
  - concise and detailed descriptions
  - category
  - 128x128 icon
  - screenshots / promotional graphics
  - support contact / homepage
- Complete Privacy:
  - permission justifications
  - data-use disclosures
  - Limited Use certification
  - privacy-policy URL

## 8. Suggested store description

> XuniDirect YouTube Cleaner helps you review and clean up your own YouTube subscriptions using the official YouTube Data API. Filter subscriptions by the date you subscribed or by channel name, preview the exact matches, choose which channels to remove, and confirm before any unsubscribe action is performed. XuniDirect does not rely on page-click automation and does not collect browser history.

## 9. Debug / clean-profile release test

1. load unpacked from the real extension folder, not a ZIP,
2. validate the manifest and service worker in `chrome://extensions`,
3. test with a clean Chrome profile,
4. test sign-in / revoke / re-auth,
5. test zero matches,
6. test a small unsubscribe batch,
7. test quota/auth failure handling,
8. inspect the final ZIP and verify `manifest.json` is at ZIP root,
9. install/test the exact release candidate,
10. only then upload/submit the store candidate.

## 10. Review strategy

First release recommendation:

1. upload as a draft,
2. validate every Privacy tab answer,
3. verify the store listing matches the actual single purpose,
4. verify no extra permissions were introduced,
5. submit for review,
6. do not describe the extension as published until the Chrome Web Store review is approved.

## Black House release gate

A public release is `STORE_READY` only when all of the following are true:

- `MANIFEST_V3_VALID`
- `MANIFEST_AT_PACKAGE_ROOT`
- `NO_REMOTE_EXECUTABLE_CODE`
- `SINGLE_PURPOSE_DECLARED`
- `PERMISSIONS_MINIMIZED`
- `SERVICE_WORKER_VALIDATED`
- `OAUTH_CLIENT_BOUND`
- `PRIVACY_POLICY_PUBLIC`
- `LIMITED_USE_DISCLOSED`
- `STORE_LISTING_COMPLETE`
- `OAUTH_PRODUCTION_STATE_ACCEPTABLE`
- `CLEAN_PROFILE_TEST_PASS`
- `STORE_PACKAGE_ROOT_VALIDATED`

Chrome Web Store approval itself is external evidence and must not be inferred from repository state.
