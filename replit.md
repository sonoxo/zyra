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
  pages/          - Page components (auth, dashboard, scans, compliance, reports, repositories, documents)
  components/     - Reusable UI components (Layout, ThemeProvider, shadcn/ui)
  lib/            - Utilities (auth, queryClient)
  hooks/          - Custom hooks (use-toast)

server/
  index.ts        - Express server entry point
  routes.ts       - All API routes (auth, scans, compliance, reports, repos, docs)
  storage.ts      - DatabaseStorage layer (IStorage interface)
  db.ts           - Database connection pool
  scan-worker.ts  - Simulated security scan workers (Semgrep, Trivy, Bandit, OWASP ZAP)
  report-generator.ts - Automated report generation with compliance mapping

shared/
  schema.ts       - Drizzle ORM schema + Zod validation + TypeScript types
```

## Key Features
1. **Multi-tenant auth** - Users belong to organizations, role-based (owner/admin/analyst/viewer)
2. **Security scanning** - Simulated Semgrep, Trivy, Bandit, OWASP ZAP scans with realistic findings
3. **Compliance mapping** - SOC2, HIPAA, ISO27001, PCI-DSS, FedRAMP, GDPR frameworks with control tracking
4. **Report generation** - Automated security audit reports with executive summary, recommendations, compliance coverage
5. **Repository management** - Connect GitHub/GitLab repositories
6. **Document upload** - PDF/DOCX document management
7. **Dashboard** - Real-time security posture with charts and analytics
8. **Export** - Reports exportable as JSON and PDF
9. **Dark mode** - Full theme support

## API Routes
- `POST/GET /api/auth/*` - Authentication (register, login, logout, me)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/scans` + `GET /api/scans/:id` + `GET /api/scans/:id/findings` - Scan management
- `GET /api/compliance` - Compliance framework mappings
- `GET/POST /api/reports` + `GET /api/reports/:id` - Report management
- `GET/POST/DELETE /api/repositories` - Repository management
- `GET/POST/DELETE /api/documents` - Document management

## Database Tables
organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports

## Demo Account
Username: demo / Password: password123
