# Zyra Technical Debt

Last updated: April 2026

## Resolved (This Sprint)

### ~~Hardcoded API Responses~~ — FIXED
- `GET /api/analytics/overview` — now computes remediation velocity, coverage, and risk from real DB data
- `GET /api/deployment/regions` — now config-driven from settings, no fake latency values
- `POST /api/sbom/scan` — now requires real package input via Zod-validated schema
- `POST /api/attack-surface/discover` — now requires domain input, no hardcoded fake assets
- `POST /api/posture/snapshot` — now computed from real scan/incident/vulnerability data
- `GET /api/posture/current` — returns zeros with guidance message when no data exists (no fake seed)
- `POST /api/security-awareness/campaigns/:id/launch` — now marks as launched without faking results
- `POST /api/dark-web/scan` — now requires domain input, returns existing alerts
- `POST /api/containers/scan` — now validates input, creates real scan record without random data
- `POST /api/monitoring/trigger` — now creates audit log entry
- `POST /api/secrets/scan` — now requires validated `findings` array, no more fake secret types
- `POST /api/vendors/:id/assess` — now requires `riskScore` and `complianceStatus` input
- `POST /api/retention-policy/purge` — no longer fakes purge counts with Math.random()

### ~~Simulation Engines Cleaned~~ — FIXED
- `scan-worker.ts` — uses all finding templates deterministically, real duration tracking, no random counts
- `simulations.ts` — pentest uses template-based findings per test type, cloud scan includes all checks, threat intel uses real CVE data
- `soar.ts` — playbook execution is deterministic (no random success/failure)
- `intelligence.ts` — CVE database has real published dates (no random date generation)
- `graph.ts` — no longer auto-seeds demo topology; returns empty graph when no data exists

### ~~Input Validation Gaps~~ — FIXED
- `POST /api/incidents` — Zod schema validates title, description, severity
- `PUT /api/incidents/:id` — Zod schema validates severity enum, status enum
- `POST /api/vulnerabilities` — Zod schema validates title, severity, CVE, CVSS
- `PUT /api/vulnerabilities/:id` — Zod schema validates severity, status, cvssScore range
- `POST /api/risks` — Zod schema validates title, likelihood, impact
- `PUT /api/risks/:id` — Zod schema validates likelihood (1-5), impact (1-5), status enum
- `POST /api/assets` — Zod schema validates name, type, criticality
- `POST /api/containers/scan` — Zod schema validates imageName, imageTag, scanType
- `PUT /api/settings` — Zod schema validates category, key required

### ~~Dashboard Error Resilience~~ — FIXED
- All 15+ parallel DB queries in `GET /api/dashboard/stats` now wrapped in `.catch(() => [])` fallbacks
- Nested pentest findings queries also wrapped with `.catch(() => [])`

### ~~Stateless JWT Logout~~ — FIXED
- In-memory token blacklist with TTL auto-cleanup
- `POST /api/auth/logout` blacklists both access AND refresh tokens
- `POST /api/auth/refresh` checks blacklist before issuing new tokens
- `requireAuth` checks blacklist before validating token

### ~~Missing Security Headers~~ — FIXED
- Helmet middleware with CSP (production w/ Stripe domains), HSTS, X-Content-Type-Options, X-Frame-Options
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

### Remaining PUT/PATCH Validation (Low Priority)
- ~15 PUT/PATCH routes still accept partial `req.body` without full Zod validation
- These are update operations on existing records behind RBAC (lower risk)
- Most critical ones (incidents, vulnerabilities, risks, settings, team roles) now validated
- **Status**: Can be addressed incrementally

### Token Blacklist Persistence
- In-memory blacklist lost on restart, not shared across instances
- **Fix**: Redis or DB-backed revocation store for multi-instance deployments
