# Zyra — AI-Native Cybersecurity Platform

## Overview
Zyra is an AI-native cybersecurity SaaS platform combining vulnerability scanning, AI pentesting, cloud security posture management, threat intelligence, compliance automation, DevSecOps monitoring, incident response, risk management, supply chain security, secrets scanning, security awareness training, vendor risk management, dark web monitoring, security roadmap planning, bug bounty management, container/Kubernetes security, SOAR automation, exposure management, Security Data Lake, threat correlation, security graph visualization, platform metrics/observability, CAASM, and ZyraCopilot (AI security analyst) into a unified enterprise platform.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT (access + refresh tokens) + bcryptjs + RBAC (owner/admin/analyst/viewer)
- **Routing**: wouter (frontend), Express (backend)
- **Email**: Resend API (domain: zyra.host)
- **Payments**: Stripe Checkout (test mode)

## Project Structure
```
client/src/
  pages/          - All page components (40+ pages + auth)
  components/     - Layout (7-group sidebar nav), ThemeProvider, shadcn/ui
  lib/            - auth, queryClient
  hooks/          - use-toast

server/
  index.ts            - Express entry (env validation, process handlers, health check, startup banner)
  routes.ts           - All API routes (auth + 24 feature modules + admin + task runner)
  auth.ts             - JWT auth middleware (requireAuth, requireRole, token generation/verification)
  storage.ts          - DatabaseStorage (IStorage interface, 50 tables)
  intelligence.ts     - ZyraCopilot engine, CVE database, threat correlation
  task-runner.ts      - Agent task execution engine
  exposure-manager.ts - Exposure Management: attack path graph, remediation engine
  team-ops.ts         - Security Team Operations: RBAC, activity feed, on-call, escalation
  enterprise.ts       - Enterprise: SIEM integration, data retention, multi-tenant workspaces
  simulations.ts      - Async simulation workers (pentest, cloud scan, threat intel)
  metrics.ts          - Prometheus-style metrics, request middleware, threat correlation
  caasm.ts            - CAASM engine: risk scoring, correlation, API routes
  exposure.ts         - Attack Path Risk Prioritization engine
  stripe.ts           - Stripe Checkout integration
  soar.ts             - SOAR automation engine (playbook execution)
  graph.ts            - Security graph nodes/edges and query functions
  scan-worker.ts      - Security scan simulations
  report-generator.ts - Automated compliance report generation
  db.ts               - PostgreSQL connection pool

shared/
  schema.ts       - Drizzle ORM schema + Zod + TypeScript types (50 tables)
```

## Environment Variables
### Required (fatal if missing)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (stored as Replit secret)

### Optional (features degrade gracefully)
- `RESEND_API_KEY` — Email sending via Resend
- `STRIPE_SECRET_KEY` — Stripe backend (billing)
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe frontend key
- `BOOTSTRAP_SECRET` — Protects POST /api/bootstrap/admin endpoint
- `EMAIL_FROM` — Sender address (default: `Zyra <noreply@zyra.host>`)
- `HF_TOKEN` — Hugging Face token (AI vision features)
- `REPLIT_DOMAINS` — Auto-set on Replit; used for Stripe/email redirect URLs

## Auth System
- JWT access tokens (15m expiry) + refresh tokens (7d expiry) in localStorage (`zyra_access_token`, `zyra_refresh_token`)
- `requireAuth` middleware validates Bearer token, checks blacklist, populates `req.user` (JwtPayload: userId, organizationId, role)
- Token blacklist: in-memory Map with TTL cleanup — logout blacklists both access AND refresh tokens
- Refresh endpoint checks blacklist before issuing new tokens
- `requireRole(...roles)` for RBAC enforcement (owner > admin > analyst > viewer)
- Frontend `queryClient.ts` auto-attaches Bearer header, handles 401 with token refresh
- Login accepts username OR email (auto-detected via `@`)
- Password reset: forgot-password → email (1hr token) → reset-password → new password
- Rate limiting: 200 req/15min general API, 20 req/15min auth endpoints, 15 req/15min invite endpoints
- Bootstrap: `POST /api/bootstrap/admin` creates owner-role user (protected by BOOTSTRAP_SECRET)
- Master admin: username=Zyra, email=zyra@zyra.host, role=owner, org=Xunia

## Server Hardening
- `helmet` middleware: HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, CSP (production w/ Stripe domains), Referrer-Policy
- `app.set("trust proxy", 1)` — Required for Replit's proxy infrastructure (rate limiter)
- `uncaughtException` handler: logs + exits
- `unhandledRejection` handler: logs (no exit)
- Health endpoint `GET /health` — checks DB connectivity, returns status/uptime/checks/version
- `/metrics` endpoint requires authentication
- Express error handler: 500s logged with stack, message sanitized in response
- Startup env validation: required vars fatal, optional vars warn
- Startup JWT_SECRET warning: loud message if using random fallback
- Startup banner: shows port, env, enabled features

## Team Invite Flow
- `POST /api/team/invite` sends invite email via Resend with 7-day expiry token
- `GET /api/invite/:token` validates token (public, no auth required)
- `POST /api/invite/:token/accept` atomically claims token, creates user account, joins org
- Frontend: `/accept-invite?token=xxx` — public page with token validation + account creation form
- Invite token claim is atomic: UPDATE with `acceptedAt IS NULL AND expiresAt > now` prevents double-use

## Billing Usage
- `GET /api/billing/usage` returns `{ users: {current, limit}, scans: {current, limit}, repositories: {current, limit} }`
- Limits sourced from subscription record (maxUsers, maxScansPerMonth, maxRepositories)
- Scans counted for current calendar month only

## Input Validation
- All PUT/PATCH routes use Zod `.strict()` schemas — unknown fields are rejected
- Validated entities: incidents, vulnerabilities, risks, assets, SBOM, secrets, attack-surface, threat-intel, alert rules, pipelines, training, campaigns, vendors, dark-web alerts, roadmap tasks, bounty reports, attack-paths, tasks, deployment config, settings
- All POST endpoints also validated: registration, login, forgot-password, reset-password, invite-accept, container scan, secrets scan, vendor assess
- Validation errors return structured `{ message, errors }` response

## Dashboard Resilience
- All 15+ parallel DB queries in `/api/dashboard/stats` use `.catch(() => [])` fallbacks
- Nested pentest findings queries also wrapped with `.catch(() => [])`
- Individual query failures don't crash the entire dashboard

## Data Integrity
- Zero seed/mock data in production paths — all data comes from real user actions
- Zero random data generation — no `Math.random()` in any API response or simulation engine
- Scan worker uses deterministic template-based findings (all templates applied, no random selection)
- Pentest simulation uses structured finding templates per test type (not random boilerplate)
- Cloud scan includes all checks deterministically (no random include/exclude)
- Threat intel seeds known CVE data once on refresh (idempotent, real CVE IDs and dates)
- SOAR playbook execution is deterministic (no random success/failure, no fake delays)
- Security graph does not auto-seed demo data — returns empty for new orgs
- Posture current endpoint returns zeros with guidance when no data exists (no fake seed)
- CVE database (`/api/cve/database`) queries threat intel items from DB — no static hardcoded CVE list
- Zero artificial delays — report generation, pentest simulation, cloud scan, SOAR execution all run without fake sleep()
- Analytics computed from real DB state (remediation velocity, coverage, risk scores)
- Pages show proper empty states when no data exists
- DB schema changes done via direct SQL (ALTER TABLE) — drizzle-kit push has interactive prompt issues

## Branding
- Logo: `attached_assets/ChatGPT_Image_Mar_30,_2026,_05_28_39_PM_1775166956477.png`
- Logo used in: sidebar (desktop+mobile), auth page (desktop+mobile), favicon
- Imported via `@assets/` alias
- Favicon: copied to `client/public/favicon.png`

## Sidebar Navigation (7 groups)
- **Overview**: Dashboard, Analytics, Security Posture, Getting Started (/onboarding)
- **Security**: Scans, AI Pentesting, Cloud Security, Container Security, Threat Intel, Attack Surface, Secrets Scanning, Dark Web Monitor
- **Operations**: Incident Response, Vulnerabilities, Risk Register, Supply Chain / SBOM, Security Roadmap, Bug Bounty, SOAR Automation
- **Governance**: Compliance, DevSecOps, Reports, Security Awareness, Vendor Risk
- **Intelligence**: CAASM, Asset Inventory, CVE Intelligence, Exposure Management, Threat Hunting, ZyraCopilot, Security Data Lake, Security Graph
- **Assets**: Repositories, Documents, Integrations
- **Platform**: Task Center, Admin Panel, Team, Audit Logs, Platform Metrics, Enterprise Readiness, Enterprise / SSO, Billing, API Keys, Settings

## Stripe Integration
- Module: `server/stripe.ts`
- Mode: Stripe Checkout (test mode) with subscription billing
- Plans: Starter ($0/free), Professional ($99/mo), Enterprise ($499/mo)
- Flow: Click Upgrade → POST `/api/stripe/create-checkout-session` → Stripe redirect → return `/billing?status=success|cancelled`
- Graceful degradation: If Stripe keys not set, plan changes apply directly without payment

## ZyraCopilot
- Real-time AI security analyst in `server/intelligence.ts` → `runSecurityCopilot()`
- 15+ query patterns: posture scoring, MTTR, prioritized actions, compliance readiness, trend analysis, threat correlation, risk assessment
- **Vision Analysis**: Upload screenshots (alerts, dashboards, suspicious emails, dark web findings) for AI-powered security analysis via Hugging Face (Gemma 3 27B) — `POST /api/copilot/vision`
- XSS-safe rendering in `client/src/pages/security-copilot.tsx` (no dangerouslySetInnerHTML)
- Posture query guard: `q.includes("posture") || (q.includes("score") && !q.includes("risk") && ...)`

## Deployment
- **Target**: Autoscale (Replit)
- **Build**: `npm run build` → Vite frontend + esbuild server → `dist/`
- **Run**: `node dist/index.cjs` (production), `npm run dev` (development)
- **Health**: `GET /health` → `{ status, uptime, checks: { database }, version }`
- **Pre-deploy**: All required secrets set, build succeeds, no seed data in routes

## Agent Skills (5)
- `zyra-architecture` — Module map, conventions, how to add features
- `zyra-debugging` — Common issues, log investigation, fix patterns
- `zyra-ui-rules` — Component patterns, styling, test attributes, empty states
- `zyra-deployment` — Production config, secrets checklist, troubleshooting
- `zyra-integrations` — Service map (Resend, Stripe), adding new integrations

## Key Development Notes
- `apiRequest(method, url, data?)` returns `Promise<Response>` — must call `.json()` to parse
- CVSS score auto-maps to severity in vulnerability form
- Risk score = likelihood × impact (both 1-5)
- All SecOps tables use UUID primary keys (`varchar` with `gen_random_uuid()`)
- Email verification required for new accounts (via Resend API)
- Account self-deletion available in Settings > Account tab
- Use `import.meta.env.VITE_*` for frontend env vars
- TanStack Query v5: object form only (`useQuery({ queryKey: ['key'] })`)
- All interactive elements have `data-testid` attributes
