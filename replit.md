# Sentinel Forge — Intelligent Autonomous Cybersecurity Platform

## Overview
Sentinel Forge is a globally scalable, AI-powered SecOps platform that combines vulnerability scanning, AI-assisted pentesting, cloud security posture management, threat intelligence, compliance automation, and continuous DevSecOps monitoring into a unified platform.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Routing**: wouter (frontend), Express (backend)

## Project Structure
```
client/src/
  pages/          - All page components (12 pages + auth)
  components/     - Layout (grouped nav sidebar), ThemeProvider, shadcn/ui
  lib/            - auth, queryClient
  hooks/          - use-toast

server/
  index.ts            - Express server entry point
  routes.ts           - All API routes (auth + 10 feature modules)
  simulations.ts      - Async simulation workers (pentest, cloud scan, threat intel)
  storage.ts          - DatabaseStorage (IStorage interface, 18 tables)
  db.ts               - Database connection
  scan-worker.ts      - Security scan simulations (Semgrep, Trivy, Bandit, ZAP)
  report-generator.ts - Automated compliance report generation

shared/
  schema.ts       - Drizzle ORM schema + Zod + TypeScript types (18 tables)
```

## Database Tables (18 total)
organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports, settings, audit_logs, api_keys, subscriptions, pentest_sessions, pentest_findings, cloud_scan_targets, cloud_scan_results, threat_intel_items, monitoring_configs, alert_rules, pipeline_configs

## Pages & Routes
| Path | Page |
|------|------|
| /dashboard | Security posture dashboard with attack surface radar, compliance maturity |
| /analytics | Advanced vulnerability analytics with MTTR, risk score, CVSS distribution |
| /scans | Security scan management (Semgrep/Trivy/Bandit/ZAP) |
| /pentest | AI Pentesting Agent with simulated SQL injection, XSS, CSRF, auth tests |
| /cloud-security | Cloud Security Posture (AWS/GCP/Azure targets + scan results) |
| /threat-intel | Threat Intelligence with CVE database, refresh, acknowledge/resolve |
| /compliance | SOC2/HIPAA/ISO27001/PCI-DSS/FedRAMP/GDPR compliance mapping |
| /devsecops | DevSecOps pipelines, continuous monitoring, alert rules |
| /reports | Report generation and export (PDF/JSON/CSV) |
| /repositories | Repository management (GitHub/GitLab) |
| /documents | Document upload and management |
| /integrations | GitHub/GitLab/Slack/Jira integrations |
| /enterprise | SSO configuration and multi-region deployment |
| /billing | Subscription management (Starter/Professional/Enterprise) |
| /api-keys | API key management with SHA-256 hashing |
| /settings | 7-tab settings center |

## API Endpoints (grouped by module)
- `POST/GET /api/auth/*` — Authentication
- `GET /api/dashboard/stats` — Enhanced dashboard (includes pentest/cloud/threat counts)
- `GET/POST /api/scans` + findings — Security scan management
- `GET/POST /api/pentest/sessions` + findings — AI pentest sessions
- `GET/POST/DELETE /api/cloud-security/targets` + results — Cloud security posture
- `POST /api/cloud-security/targets/:id/scan` — Run cloud security simulation
- `GET/POST/PUT /api/threat-intel` — CVE threat intelligence
- `POST /api/threat-intel/refresh` — Refresh CVE database
- `GET/PUT /api/monitoring/configs` + trigger — Continuous monitoring
- `GET/POST/PUT/DELETE /api/alerts/rules` — Alert rule management
- `GET/POST/PUT/DELETE /api/pipelines` — DevSecOps pipeline configs
- `GET /api/compliance` — Compliance framework mappings
- `GET/POST /api/reports` + export — Report management (PDF/CSV)
- `GET/POST/DELETE /api/repositories` — Repository management
- `GET/POST/DELETE /api/documents` — Document management
- `GET/PUT /api/settings` — Settings management
- `GET /api/audit-logs` + CSV export — Audit logging
- `GET/POST/DELETE /api/api-keys` — API key management
- `GET/PUT /api/billing/subscription` + usage + plans — Billing
- `GET/PUT /api/sso/config` — SSO configuration
- `GET /api/analytics/vulnerabilities` — Advanced analytics
- `GET /api/deployment/regions` + config — Multi-region deployment

## Key Features
1. **AI Pentesting Agent** — Authorized simulated testing: SQL injection, XSS, CSRF, auth weaknesses, API security, access control
2. **Cloud Security Posture** — AWS/GCP/Azure target management with IAM, storage, network, and firewall checks
3. **Threat Intelligence** — CVE database with severity scoring, package tracking, acknowledge/resolve workflow
4. **DevSecOps Automation** — GitHub Actions, GitLab CI, Bitbucket, Jenkins, Docker pipeline integrations
5. **Continuous Monitoring** — Real-time, daily, weekly, monthly scan scheduling with alert rules
6. **Security Alerting** — Email, Slack, Webhook, SIEM channels with configurable triggers
7. **Compliance Mapping** — SOC2, HIPAA, ISO27001, PCI-DSS, FedRAMP, GDPR with maturity scoring
8. **Advanced Analytics** — MTTR, risk scoring, CVSS distribution, attack surface radar
9. **Enterprise SSO** — SAML, OIDC, Azure AD, Okta configuration
10. **API Key Management** — SHA-256 hashed keys with permissions and expiration
11. **Billing & Subscriptions** — Starter/Professional/Enterprise plans
12. **Multi-tenant RBAC** — owner/admin/analyst/viewer roles throughout

## Demo Account
Username: `demo` / Password: `password123`
