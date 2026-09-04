# XuniDirect YouTube Cleaner Support

XuniDirect helps users review and manage their own YouTube subscriptions using the official YouTube Data API.

## Common checks

- Confirm Chrome is up to date.
- Confirm the extension is enabled.
- Confirm the correct Google/YouTube account is authorized.
- If sign-in fails, revoke XuniDirect access in the Google Account permissions page and reconnect.
- If scanning returns zero matches, adjust the before/after date filters and channel-name filter.
- If YouTube API quota is reached, already completed unsubscribe actions remain completed; retry later after quota is available.

## Privacy / security

XuniDirect does not require users to enter a Google password into the extension, does not collect browser history, and does not execute remotely hosted JavaScript.

## Report a problem

Open a GitHub issue in `sonoxo/zyra` and include:

1. Chrome version,
2. XuniDirect version,
3. the action being attempted,
4. the exact visible error message,
5. whether the issue occurs during connect, scan, filter, selection, or unsubscribe.

Do not post OAuth tokens, client secrets, passwords, or other credentials in a public issue.
