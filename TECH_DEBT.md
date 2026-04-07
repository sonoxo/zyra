# Zyra Technical Debt

Last updated: April 2026

## Priority 1 — Production Blockers

### Hardcoded API Responses
Some endpoints return static/simulated data instead of real computed values:
- `GET /api/analytics/overview` — returns hardcoded strings (`"4.2 days"` remediation velocity, `"92%"` attack surface coverage)
- `GET /api/deployment/regions` — static list with fake latency values
- `POST /api/sbom/scan` — simulates scan with hardcoded package list instead of real SBOM analysis
- `POST /api/monitoring/trigger` — stub that returns success without doing anything
- **Fix**: Replace with real computations from database or remove until real integrations exist

### Input Validation Gaps
- `POST /api/incidents` and `POST /api/vulnerabilities` accept `req.body` directly without Zod schema validation
- `POST /api/auth/resend-verification` doesn't validate email format
- **Fix**: Add Zod parsing with insert schemas from `@shared/schema.ts`

### Dashboard Error Resilience
- `GET /api/dashboard/stats` makes ~15 parallel DB calls in a single handler; if any one fails, the entire dashboard returns 500
- **Fix**: Wrap individual queries in try/catch with fallback defaults

## Priority 2 — Security Improvements

### Stateless JWT Logout
- `POST /api/auth/logout` returns success but doesn't invalidate the JWT (token remains valid until expiry)
- **Fix**: Implement a token blacklist (Redis or DB table) for revoked tokens, or switch to shorter-lived tokens with refresh rotation

### Missing Security Headers
- No Content Security Policy (CSP) headers
- No CSRF token implementation
- **Fix**: Add `helmet` middleware with CSP config; evaluate CSRF needs for API-only auth

### Bootstrap Admin Empty Catch
- `POST /api/bootstrap/admin` has `catch {}` blocks that silently swallow database errors
- **Fix**: Log errors in catch blocks, return meaningful error responses

## Priority 3 — Performance & DX

### Frontend Bundle Size
- Single JS chunk is 1.5MB (after minification)
- **Fix**: Code-split with lazy `React.lazy()` + `Suspense` for route-level splitting

### TypeScript Strict Errors
- `npx tsc --noEmit` reports ~104 type errors (pre-existing, non-blocking at runtime)
- **Fix**: Incrementally resolve; mostly schema/field mismatches in `caasm.ts`, `metrics.ts`, `enterprise.ts`

### Database Schema Drift
- Schema changes done via direct SQL instead of Drizzle migrations
- `drizzle-kit push` has interactive prompt issues in CI
- **Fix**: Use `npm run db:push --force` or create migration scripts

## Priority 4 — Future Architecture

### SIEM/Cloud/SSO Integrations
- Enterprise page UI exists for Splunk, Elastic, Sentinel, SAML SSO
- Backend stores configs but doesn't connect to real services
- **Status**: Awaiting real service credentials; UI is ready

### Notification System
- Alert rules UI exists in DevSecOps page (Slack, webhooks)
- Backend stores configs but doesn't send real notifications
- **Status**: Needs webhook delivery system with retry logic
