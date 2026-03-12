# Sentinel Forge — Intelligent Autonomous Cybersecurity Platform

## Overview
Sentinel Forge is a globally scalable, AI-powered SecOps platform combining vulnerability scanning, AI pentesting, cloud security posture management, threat intelligence, compliance automation, DevSecOps monitoring, incident response, risk management, supply chain security, secrets scanning, security awareness training, vendor risk management, dark web monitoring, security roadmap planning, bug bounty management, container/Kubernetes security, SOAR automation, Security Data Lake, threat correlation, security graph visualization, platform metrics/observability, and CAASM (Cyber Asset Attack Surface Management) into a unified enterprise platform.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Routing**: wouter (frontend), Express (backend)

## Project Structure
```
client/src/
  pages/          - All page components (38 pages + auth)
  components/     - Layout (6-group sidebar nav), ThemeProvider, shadcn/ui
  lib/            - auth, queryClient
  hooks/          - use-toast

server/
  index.ts            - Express server entry point
  routes.ts           - All API routes (auth + 24 feature modules); exports requireAuth
  simulations.ts      - Async simulation workers (pentest, cloud scan, threat intel)
  storage.ts          - DatabaseStorage (IStorage interface, 44 tables)
  team-ops.ts         - Security Team Operations: RBAC permissions matrix, activity feed, incident comments, on-call scheduling, escalation policies, approval workflows
  db.ts               - Database connection
  scan-worker.ts      - Security scan simulations (Semgrep, Trivy, Bandit, ZAP)
  report-generator.ts - Automated compliance report generation
  soar.ts             - SOAR automation engine (6 built-in playbooks, execution simulator)
  metrics.ts          - Prometheus metrics, request middleware, threat correlation, event seeding
  graph.ts            - Security graph seeding (14 nodes, 15 edges) and query functions
  caasm.ts            - CAASM engine: risk scoring, correlation, identity seeding, API routes
  exposure.ts         - Attack Path Risk Prioritization engine: exposure scoring, exploitability detection, critical path detection, composite risk scoring, remediation generation

shared/
  schema.ts       - Drizzle ORM schema + Zod + TypeScript types (44 tables)
```

## Database Tables (44 total)
**Core (18):** organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports, settings, audit_logs, api_keys, subscriptions, pentest_sessions, pentest_findings, cloud_scan_targets, cloud_scan_results, threat_intel_items, monitoring_configs, alert_rules, pipeline_configs

**SecOps (7):** incidents, vulnerabilities, sbom_items, secrets_findings, risks, attack_surface_assets, posture_scores

**New Modules (8):** training_records, phishing_campaigns, vendors, dark_web_alerts, remediation_tasks, bounty_reports, container_scans, container_findings

**Intelligence Layer (6):** asset_inventory, attack_paths, threat_hunt_queries, copilot_conversations, graph_nodes, graph_edges

**Enterprise Layer (5):** security_events, soar_playbooks, soar_executions, caasm_identities, notifications/invite_tokens/onboarding_steps (misc)

**Team Operations (5):** incident_comments, team_activities, oncall_schedules, escalation_policies, approval_requests

## Sidebar Navigation (6 groups)
- **Overview**: Dashboard, Analytics, Security Posture, Getting Started (/onboarding)
- **Security**: Scans, AI Pentesting, Cloud Security, Container Security, Threat Intel, Attack Surface, Secrets Scanning, Dark Web Monitor
- **Operations**: Incident Response, Vulnerabilities, Risk Register, Supply Chain / SBOM, Security Roadmap, Bug Bounty, SOAR Automation
- **Governance**: Compliance, DevSecOps, Reports, Security Awareness, Vendor Risk
- **Intelligence**: CAASM, Asset Inventory, CVE Intelligence, Attack Path Modeling, Threat Hunting, Security Copilot, Security Data Lake, Security Graph
- **Assets**: Repositories, Documents, Integrations
- **Platform**: Team, Team Activity, On-Call Schedule, Approvals, Audit Logs, Platform Metrics, Enterprise / SSO, Billing, API Keys, Settings

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
| /risks | Risk Register (likelihood × impact matrix, heat map, treatment workflow) |
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

## Key Notes
- `apiRequest` returns `Promise<Response>` — must call `.json()` to parse body
- CVSS score auto-maps to severity in vulnerability form (≥9=critical, ≥7=high, ≥4=medium)
- Risk score = likelihood × impact (both 1–5 via Select dropdowns)
- All 7 new SecOps tables use UUID primary keys (`varchar` with `gen_random_uuid()`)
- Demo account: `demo` / `password123`
