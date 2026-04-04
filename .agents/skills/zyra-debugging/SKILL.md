---
name: zyra-debugging
description: Debugging patterns for the Zyra platform. Use when investigating server errors, auth issues, rate limiting problems, or deployment failures.
---

# Zyra Debugging

## Common Issues & Fixes

### ERR_ERL_UNEXPECTED_X_FORWARDED_FOR (rate limiter crash)
- **Cause**: Missing `app.set("trust proxy", 1)` in `server/index.ts`
- **Fix**: Ensure this line exists early in the Express setup (before rate limiters)
- **Symptom**: 401/500 on login, all API calls fail

### Login returns 401 but credentials are correct
1. Check rate limiter isn't blocking (20 req/15min on auth endpoints)
2. Verify `trust proxy` is set (see above)
3. Check JWT_SECRET is set as a Replit secret
4. Check user exists: query `SELECT * FROM users WHERE username = '...'`

### Health endpoint returns 503
- Database is unreachable — check `DATABASE_URL` env var
- Run `curl http://localhost:5000/health` to see which check failed

### Process crashes silently
- Check for `UNCAUGHT EXCEPTION` or `UNHANDLED REJECTION` in logs
- Process handlers in `server/index.ts` will log these

### Email not sending
- Verify `RESEND_API_KEY` is set
- Check `EMAIL_FROM` — must match verified Resend domain (zyra.host)
- Resend logs the email ID on success; check server logs

### Stripe checkout failing
- Verify both `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are set
- Check `GET /api/stripe/status` for config check
- Without keys, billing falls back to direct plan changes

### DB schema out of sync
- Never use `drizzle-kit push` interactively (blocks on prompts)
- Use direct SQL: `ALTER TABLE ... ADD COLUMN ...`
- Or: `npm run db:push --force`

## Log Investigation
1. Check workflow logs via refresh_all_logs
2. Grep for `ERROR`, `FATAL`, `UNCAUGHT`, `UNHANDLED`
3. API request logger in index.ts logs: `METHOD /path STATUS in Xms :: body`
4. Sensitive paths (/api/auth, /api/api-keys, /api/admin/env) have body redacted

## Key Files for Debugging
- `server/index.ts` — startup, middleware, error handlers
- `server/auth.ts` — token validation logic
- `server/routes.ts` — route registration, request validation
- `server/storage.ts` — all DB queries
