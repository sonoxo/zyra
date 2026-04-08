# Zyra Technical Debt

Last updated: April 2026

## Resolved (This Sprint)

### ~~Hardcoded API Responses~~ — FIXED
- `GET /api/analytics/overview` — now computes remediation velocity, coverage, and risk from real DB data
- `GET /api/deployment/regions` — now config-driven from settings, no fake latency values
- `POST /api/sbom/scan` — now requires real package input via Zod-validated schema
- `POST /api/attack-surface/discover` — now requires domain input, no hardcoded fake assets
- `POST /api/posture/snapshot` — now computed from real scan/incident/vulnerability data
- `POST /api/security-awareness/campaigns/:id/launch` — now marks as launched without faking results
- `POST /api/dark-web/scan` — now requires domain input, returns existing alerts
- `POST /api/containers/scan` — now validates input, creates real scan record without random data
- `POST /api/monitoring/trigger` — now creates audit log entry
- `POST /api/secrets/scan` — now requires validated `findings` array, no more fake secret types or Math.random()
- `POST /api/vendors/:id/assess` — now requires `riskScore` and `complianceStatus` input, no more random values

### ~~Input Validation Gaps~~ — FIXED
- `POST /api/incidents` — Zod schema validates title, description, severity
- `POST /api/vulnerabilities` — Zod schema validates title, severity, CVE, CVSS
- `POST /api/risks` — Zod schema validates title, likelihood, impact
- `POST /api/assets` — Zod schema validates name, type, criticality
- `POST /api/containers/scan` — Zod schema validates imageName, imageTag, scanType

### ~~Dashboard Error Resilience~~ — FIXED
- All 15+ parallel DB queries in `GET /api/dashboard/stats` now wrapped in `.catch(() => [])` fallbacks

### ~~Stateless JWT Logout~~ — FIXED
- In-memory token blacklist with TTL auto-cleanup
- `POST /api/auth/logout` blacklists both access AND refresh tokens
- `POST /api/auth/refresh` checks blacklist before issuing new tokens
- `requireAuth` checks blacklist before validating token

### ~~Missing Security Headers~~ — FIXED
- Helmet middleware with CSP (production), HSTS, X-Content-Type-Options, X-Frame-Options, etc.
- `/metrics` endpoint now requires authentication

### ~~JWT_SECRET Warning~~ — FIXED
- Startup warns loudly if JWT_SECRET is using random fallback

## Priority 3 — Performance & DX

### Frontend Bundle Size
- Single JS chunk is ~1.5MB (after minification)
- **Fix**: Code-split with lazy `React.lazy()` + `Suspense` for route-level splitting

### TypeScript Strict Errors
- `npx tsc --noEmit` reports ~104 type errors (pre-existing, non-blocking at runtime)
- **Fix**: Incrementally resolve; mostly schema/field mismatches

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

### Remaining Validation Gaps (Low Priority)
- Several PUT/PATCH routes still accept `req.body` directly
- These are update operations on existing records (lower risk than creates)
- **Status**: Can be addressed incrementally
