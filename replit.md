# Zyra — AI-Native Cybersecurity Platform

## Overview
Zyra is an AI-native cybersecurity ecosystem combining vulnerability scanning, AI pentesting, cloud security posture management, threat intelligence, compliance automation, DevSecOps monitoring, incident response, risk management, supply chain security, secrets scanning, security awareness training, vendor risk management, dark web monitoring, security roadmap planning, bug bounty management, container/Kubernetes security, SOAR automation, exposure management, Security Data Lake, threat correlation, security graph visualization, platform metrics/observability, and CAASM (Cyber Asset Attack Surface Management) into a unified enterprise platform.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT (access + refresh tokens via jsonwebtoken) + bcryptjs + RBAC (owner/admin/analyst/viewer)
- **Routing**: wouter (frontend), Express (backend)

## Project Structure
```
client/src/
  pages/          - All page components (40+ pages + auth)
  components/     - Layout (7-group sidebar nav), ThemeProvider, shadcn/ui
  lib/            - auth, queryClient
  hooks/          - use-toast

server/
  index.ts            - Express server entry point (env validation at startup)
  routes.ts           - All API routes (auth + 24 feature modules + admin + task runner)
  auth.ts             - JWT auth middleware (requireAuth, requireRole, token generation/verification)
  storage.ts          - DatabaseStorage (IStorage interface, 50 tables)
  task-runner.ts      - Agent task execution engine (scan, playbook, remediation, audit, compliance, general)
  exposure-manager.ts - Exposure Management: attack path graph visualizer, exposure monitor, remediation engine
  team-ops.ts         - Security Team Operations: RBAC, activity feed, on-call scheduling, escalation, approvals
  enterprise.ts       - Enterprise Readiness: SIEM integration, data retention, multi-tenant workspaces
  simulations.ts      - Async simulation workers (pentest, cloud scan, threat intel)
  db.ts               - Database connection
  scan-worker.ts      - Security scan simulations (Semgrep, Trivy, Bandit, ZAP)
  report-generator.ts - Automated compliance report generation
  soar.ts             - SOAR automation engine (playbook execution)
  metrics.ts          - Prometheus metrics, request middleware, threat correlation
  graph.ts            - Security graph nodes/edges and query functions
  caasm.ts            - CAASM engine: risk scoring, correlation, API routes
  exposure.ts         - Attack Path Risk Prioritization engine
  stripe.ts           - Stripe Checkout integration: session creation, status retrieval, graceful degradation

shared/
  schema.ts       - Drizzle ORM schema + Zod + TypeScript types (50 tables)
```

## Database Tables (50 total)
**Core (18):** organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports, settings, audit_logs, api_keys, subscriptions, pentest_sessions, pentest_findings, cloud_scan_targets, cloud_scan_results, threat_intel_items, monitoring_configs, alert_rules, pipeline_configs

**SecOps (7):** incidents, vulnerabilities, sbom_items, secrets_findings, risks, attack_surface_assets, posture_scores

**New Modules (8):** training_records, phishing_campaigns, vendors, dark_web_alerts, remediation_tasks, bounty_reports, container_scans, container_findings

**Intelligence Layer (6):** asset_inventory, attack_paths, threat_hunt_queries, copilot_conversations, graph_nodes, graph_edges

**Enterprise Layer (5):** security_events, soar_playbooks, soar_executions, caasm_identities, notifications/invite_tokens/onboarding_steps (misc)

**Team Operations (5):** incident_comments, team_activities, oncall_schedules, escalation_policies, approval_requests

**Exposure Management (2):** exposure_alerts, remediation_actions

**Enterprise Readiness (3):** siem_configs, retention_policies, workspaces

**Task Center (1):** tasks (queue with status: pending/running/completed/failed/cancelled, agent execution with results)

## Sidebar Navigation (7 groups)
- **Overview**: Dashboard, Analytics, Security Posture, Getting Started (/onboarding)
- **Security**: Scans, AI Pentesting, Cloud Security, Container Security, Threat Intel, Attack Surface, Secrets Scanning, Dark Web Monitor
- **Operations**: Incident Response, Vulnerabilities, Risk Register, Supply Chain / SBOM, Security Roadmap, Bug Bounty, SOAR Automation
- **Governance**: Compliance, DevSecOps, Reports, Security Awareness, Vendor Risk
- **Intelligence**: CAASM, Asset Inventory, CVE Intelligence, Exposure Management, Threat Hunting, Security Copilot, Security Data Lake, Security Graph
- **Assets**: Repositories, Documents, Integrations
- **Platform**: Task Center, Admin Panel, Team, Audit Logs, Platform Metrics, Enterprise Readiness, Enterprise / SSO, Billing, API Keys, Settings

## Pages & Routes
| Path | Page |
|------|------|
| /dashboard | Security posture dashboard with attack surface radar, compliance maturity |
| /analytics | Advanced vulnerability analytics with MTTR, risk score, CVSS distribution |
| /posture | Security Posture Score Trending with gauge, category bars, snapshot history |
| /scans | Security scan management (Semgrep/Trivy/Bandit/ZAP) |
| /pentest | AI Pentesting Agent with simulated SQL injection, XSS, CSRF, auth tests |
| /cloud-security | Cloud Security Posture (AWS/GCP/Azure targets + scan results) |
| /threat-intel | Threat Intelligence with CVE database, refresh, acknowledge/resolve |
| /attack-surface | Attack Surface Management (auto-discovery, asset tracking, risk scoring) |
| /secrets | Secrets Scanning (AWS keys, GitHub tokens, DB creds across repos) |
| /incidents | Incident Response Management (triage, investigate, contain, resolve, close) |
| /vulnerabilities | Vulnerability Lifecycle Tracking (CVE, CVSS, status, severity) |
| /risks | Risk Register (likelihood x impact matrix, heat map, treatment workflow) |
| /sbom | Supply Chain / SBOM (dependency scanning, vulnerability mapping) |
| /compliance | SOC2/HIPAA/ISO27001/PCI-DSS/FedRAMP/GDPR compliance mapping |
| /devsecops | DevSecOps pipelines, continuous monitoring, alert rules |
| /reports | Report generation and export (PDF/JSON/CSV) |
| /security-awareness | Phishing simulations + training records management |
| /vendor-risk | Vendor assessment, risk scoring, compliance tracking |
| /dark-web | Dark web leak scanning, alert management |
| /security-roadmap | Kanban-style remediation task tracking with progress |
| /bug-bounty | Bug bounty program — submit, triage, accept, reward |
| /container-security | Container image & Kubernetes cluster vulnerability scanning |
| /onboarding | 8-step getting started checklist with progress tracking |
| /admin | Admin Panel — user/role management, platform activity, system controls, env status |
| /task-center | Task Center — queue, agent execution, activity log |
| /repositories | Repository management (GitHub/GitLab) |
| /documents | Document upload and management |
| /integrations | GitHub/GitLab/Slack/Jira integrations |
| /enterprise | SSO configuration and multi-region deployment |
| /billing | Subscription management (Starter/Professional/Enterprise) |
| /api-keys | API key management with SHA-256 hashing |
| /settings | 7-tab settings center |

## API Endpoints (grouped by module)
- `POST/GET /api/auth/*` — Authentication
- `GET /api/dashboard/stats` — Dashboard stats
- `GET/POST /api/scans` + findings — Security scan management
- `GET/POST /api/pentest/sessions` + findings — AI pentest sessions
- `GET/POST/DELETE /api/cloud-security/targets` + results + scan — Cloud security
- `GET/POST/PUT /api/threat-intel` + refresh — CVE threat intelligence
- `GET/PUT /api/monitoring/configs` + trigger — Continuous monitoring
- `GET/POST/PUT/DELETE /api/alerts/rules` — Alert rules
- `GET/POST/PUT/DELETE /api/pipelines` — DevSecOps pipeline configs
- `GET /api/compliance` — Compliance framework mappings
- `GET/POST /api/reports` + export — Report management
- `GET/POST/DELETE /api/repositories` — Repository management
- `GET/POST/DELETE /api/documents` — Document management
- `GET/PUT /api/settings` — Settings management
- `GET /api/audit-logs` + CSV export — Audit logging
- `GET/POST/DELETE /api/api-keys` — API key management
- `GET/PUT /api/billing/subscription` + usage + plans — Billing
- `GET /api/stripe/status` — Stripe configuration check
- `POST /api/stripe/create-checkout-session` — Create Stripe Checkout session
- `GET /api/stripe/session/:sessionId` — Retrieve Stripe Checkout session status
- `GET/PUT /api/sso/config` — SSO configuration
- `GET /api/analytics/vulnerabilities` — Advanced analytics
- `GET /api/deployment/regions` + config — Multi-region deployment
- `GET/POST/PATCH /api/incidents` + timeline — Incident Response
- `GET/POST/PATCH /api/vulnerabilities` — Vulnerability Lifecycle
- `GET/POST /api/sbom` + scan — Supply Chain SBOM
- `GET/POST/PATCH /api/secrets` + scan — Secrets Scanning
- `GET/POST/PATCH /api/risks` — Risk Register
- `GET/POST/PATCH /api/attack-surface` + discover — Attack Surface Management
- `GET/POST /api/posture/scores` + current — Posture Score Trending
- `GET/POST/DELETE /api/security-awareness/records` + campaigns + stats — Security Awareness
- `GET/POST/DELETE /api/vendors` + assess + stats — Vendor Risk Management
- `GET/POST/DELETE /api/dark-web/alerts` + scan + stats — Dark Web Monitoring
- `GET/POST/PUT/DELETE /api/roadmap/tasks` + stats — Security Roadmap
- `GET/POST/PUT/DELETE /api/bounty/reports` + stats — Bug Bounty
- `GET/POST /api/containers/scans` + findings + scan + stats — Container Security
- `GET/POST /api/onboarding` + complete step — Onboarding Checklist
- `GET/POST/PATCH/DELETE /api/tasks` + stats/summary — Task Center
- `POST /api/tasks/:id/execute` — Execute single task via agent
- `POST /api/tasks/execute-pending` — Execute all pending tasks
- `GET /api/tasks/execution-history` — Task execution history
- `GET /api/admin/overview` — Admin panel overview (owner/admin only)
- `GET /api/admin/env-status` — Environment variable status
- `PATCH /api/admin/users/:id/role` — Change user role (owner only)
- `DELETE /api/admin/users/:id` — Remove user (owner only)
- `POST /api/auth/refresh` — Token refresh

## Task Runner / Agent Layer
- **Module**: `server/task-runner.ts`
- **Task Types**: scan, playbook, remediation, audit, compliance, general
- **Flow**: Create task (pending) → Execute (running) → Completed/Failed
- **Features**: Auto-creates audit logs, sends notifications on completion/failure, logs execution duration
- **Admin**: Can batch-execute all pending tasks from Admin Panel

## Stripe Integration
- **Module**: `server/stripe.ts` — Stripe Checkout session creation, status retrieval
- **Mode**: Stripe Checkout (test mode) with subscription billing
- **Plans**: Starter ($0/free), Professional ($99/mo), Enterprise ($499/mo)
- **Secrets**: `STRIPE_SECRET_KEY` (backend), `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)
- **Flow**: Click Upgrade → POST `/api/stripe/create-checkout-session` → redirect to Stripe → return to `/billing?status=success|cancelled`
- **Graceful degradation**: If Stripe keys not configured, plan changes apply directly without payment

## Auth System
- JWT access tokens (15m expiry) + refresh tokens (7d expiry) stored in localStorage (`zyra_access_token`, `zyra_refresh_token`)
- `requireAuth` middleware validates Bearer token and populates `req.user` (JwtPayload: userId, organizationId, role)
- `requireRole(...roles)` middleware for RBAC enforcement (owner > admin > analyst > viewer)
- Frontend `queryClient.ts` auto-attaches Bearer header and handles 401 with token refresh
- Rate limiting: 200 req/15min general, 20 req/15min auth endpoints

## Environment Validation
- Startup env validation in `server/index.ts`
- **Required**: `DATABASE_URL`, `JWT_SECRET` (fatal error if missing)
- **Optional**: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` (warning, features limited)

## Mock Data Status
- All seed functions removed from route handlers (no fake data injection on access)
- Pages show empty states when no data exists
- All data comes from real user actions (creating tasks, running scans, etc.)

## Key Notes
- `apiRequest` returns `Promise<Response>` — must call `.json()` to parse body
- CVSS score auto-maps to severity in vulnerability form
- Risk score = likelihood x impact (both 1-5 via Select dropdowns)
- All SecOps tables use UUID primary keys (`varchar` with `gen_random_uuid()`)
- Email verification required for new accounts (via Resend API)
- Account self-deletion available in Settings > Account tab
- `RESEND_API_KEY` secret required for sending verification emails
- `EMAIL_FROM` env var optional (defaults to `Zyra <noreply@zyra.dev>`)
