# Sentinel Forge - AI Security Compliance Platform

## Overview
Sentinel Forge is a globally scalable AI-powered SecOps compliance platform that unifies vulnerability scanning, compliance mapping, and automated audit reporting.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Charts**: Recharts
- **Routing**: wouter (frontend), Express (backend)

## Project Structure
```
client/src/
  pages/          - Page components (auth, dashboard, scans, compliance, reports, repositories, documents, settings, integrations)
  components/     - Reusable UI components (Layout, ThemeProvider, shadcn/ui)
  lib/            - Utilities (auth, queryClient)
  hooks/          - Custom hooks (use-toast)

server/
  index.ts        - Express server entry point
  routes.ts       - All API routes (auth, scans, compliance, reports, repos, docs, settings, audit-logs)
  storage.ts      - DatabaseStorage layer (IStorage interface)
  db.ts           - Database connection pool
  scan-worker.ts  - Simulated security scan workers (Semgrep, Trivy, Bandit, OWASP ZAP)
  report-generator.ts - Automated report generation with compliance mapping

shared/
  schema.ts       - Drizzle ORM schema + Zod validation + TypeScript types
```

## Key Features
1. **Multi-tenant auth** - Users belong to organizations, role-based (owner/admin/analyst/viewer)
2. **RBAC enforcement** - Server-side role checks on mutations (owner/admin for settings, repos, docs; analyst+ for scans, reports)
3. **Security scanning** - Simulated Semgrep, Trivy, Bandit, OWASP ZAP scans with realistic findings
4. **Compliance mapping** - SOC2, HIPAA, ISO27001, PCI-DSS, FedRAMP, GDPR frameworks with control tracking
5. **Report generation** - Automated security audit reports with executive summary, recommendations, compliance coverage
6. **Export** - Reports exportable as JSON, PDF, and CSV (with formula injection protection)
7. **Repository management** - Connect GitHub/GitLab repositories
8. **Document upload** - PDF/DOCX document management
9. **Settings center** - Organization, scanning, compliance, notifications, data retention, AI report settings
10. **Integrations** - GitHub, GitLab, Slack, Jira integration management
11. **Audit logging** - All key actions logged with user, action, resource, timestamp
12. **Dashboard** - Real-time security posture with charts and analytics
13. **Dark mode** - Full theme support

## API Routes
- `POST/GET /api/auth/*` - Authentication (register, login, logout, me)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/scans` + `GET /api/scans/:id` + `GET /api/scans/:id/findings` - Scan management
- `GET /api/compliance` - Compliance framework mappings
- `GET/POST /api/reports` + `GET /api/reports/:id` - Report management
- `GET /api/reports/:id/export/pdf` - PDF export
- `GET /api/reports/:id/export/csv` - CSV export
- `GET/POST/DELETE /api/repositories` - Repository management
- `GET/POST/DELETE /api/documents` - Document management
- `GET/PUT /api/settings` - Settings management
- `GET /api/audit-logs` - Audit log retrieval (admin/owner only)

## Database Tables
organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports, settings, audit_logs

## Demo Account
Username: demo / Password: password123
