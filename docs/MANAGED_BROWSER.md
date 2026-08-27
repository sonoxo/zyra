# ZYRA Managed Profile Browser

ZYRA can browse authenticated websites through a **local managed copy of a Chrome profile**.

## Model

```text
Existing local Chrome profile
  → local profile import
  → ~/.xunia/browser-profile
  → Chrome on 127.0.0.1:9222
  → ZYRA authenticated navigation/read
  → XUNIA policy + audit boundary
```

The managed profile stays on the same computer. ZYRA does not upload or print passwords, raw cookies, or browser credential stores. Chrome remains responsible for decrypting its own local session state through the operating system.

If a copied session cannot be decrypted or has expired, open the managed Chrome window and sign in once. Future ZYRA reads reuse that managed browser session.

## API

Authenticated ZYRA API routes:

- `GET /api/browser/status`
- `POST /api/browser/profile/import` with `{ "profileName": "Default" }` or a Chrome profile such as `Profile 1`
- `POST /api/browser/start`
- `POST /api/browser/open` with `{ "url": "https://example.com" }`
- `GET /api/browser/read?targetId=<id>`

Only `http:` and `https:` navigation is allowed. `file:`, `javascript:` and other schemes are rejected.

## First use

1. Close normal Chrome before importing a profile so its databases are in a consistent state.
2. Import `Default` or the desired `Profile N` through the local ZYRA API.
3. Start the managed browser.
4. If a site asks for authentication, complete that sign-in manually in the managed Chrome window.
5. ZYRA can then open and read pages using that authenticated session.

## Security boundary

This implementation enables authenticated **navigation and read access**. It intentionally does not expose password extraction, cookie export, arbitrary local file access, automatic purchases, automatic messages, or other consequential browser mutations. Consequential actions remain behind explicit human approval in the XUNIA/GLASS ONION policy model.

Environment overrides:

- `XUNIA_BROWSER_PROFILE_DIR`
- `XUNIA_BROWSER_DEBUG_PORT`
- `XUNIA_CHROME_EXECUTABLE`
