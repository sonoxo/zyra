# Zyra Architecture

## System Overview

Zyra is a monolithic full-stack TypeScript application designed for rapid iteration and straightforward deployment. The architecture prioritizes developer velocity while maintaining clear separation of concerns.

```
                    ┌──────────────────────┐
                    │     Reverse Proxy     │
                    │   (Replit / Nginx)    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │    Express Server     │
                    │   (Port 5000)         │
                    ├──────────────────────┤
                    │  API Routes          │ ← /api/*
                    │  Session Middleware   │
                    │  Auth Middleware      │
                    │  Vite Dev Middleware  │ ← Development only
                    │  Static Assets       │ ← Production only
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
    │   Storage       │ │  Engines    │ │  Workers     │
    │   Layer         │ │             │ │              │
    │  DatabaseStorage│ │  SOAR       │ │  Scan Worker │
    │  (IStorage)     │ │  CAASM      │ │  Simulations │
    │                 │ │  Exposure   │ │  Report Gen  │
    │  Drizzle ORM    │ │  Metrics    │ │              │
    └────────┬────────┘ └─────────────┘ └──────────────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │
    │   (49 tables)   │
    └─────────────────┘
```

## Frontend Architecture

### Stack
- **React 18** with TypeScript and JSX transform (no explicit React imports)
- **Vite** for bundling and HMR
- **Tailwind CSS** with shadcn/ui component library
- **wouter** for client-side routing
- **TanStack Query v5** for server state management
- **Recharts** for data visualization

### State Management
- Server state: TanStack Query with automatic cache invalidation
- UI state: React `useState` / `useReducer` (component-local)
- Theme: Custom `ThemeProvider` with `localStorage` persistence (`zyra-theme` key)
- Auth: Custom `useAuth` hook backed by `/api/auth/me` query

### Routing
46 pages registered in `client/src/App.tsx` using wouter's `Route` component. The `Layout` component provides a collapsible sidebar organized into 7 navigation groups.

### API Communication
- `apiRequest(method, url, body?)` — Thin wrapper returning `Response` (must call `.json()` to parse)
- Default TanStack Query `queryFn` configured in `queryClient.ts`
- Mutations invalidate cache by `queryKey` after success

## Backend Architecture

### Express Server
Single Express application serving both API and frontend:
- **Development**: Vite dev middleware for HMR
- **Production**: Static file serving from `dist/public`

### Middleware Stack
1. `express.json()` — Body parsing
2. `express-session` + `connect-pg-simple` — Session management
3. `requireAuth` — Authentication guard (exported from `routes.ts`)
4. `requireAdmin` — Admin-only guard (local to `enterprise.ts`)
5. `requireAnalyst` — Analyst+ guard (local to `exposure-manager.ts`)

### Module System
Routes are organized into feature modules, each registered in `routes.ts`:

| Module | File | Responsibilities |
|--------|------|-----------------|
| Auth | `routes.ts` | Login, register, session management |
| Scans | `routes.ts` | Vulnerability scanning (4 tools) |
| Pentesting | `routes.ts` | AI-driven penetration testing |
| Cloud Security | `routes.ts` | CSPM for AWS/GCP/Azure |
| Exposure | `exposure-manager.ts` | Attack paths, monitoring, remediation |
| Enterprise | `enterprise.ts` | SIEM, retention, workspaces |
| Team Ops | `team-ops.ts` | RBAC, activity, on-call, approvals |
| SOAR | `soar.ts` | Playbook automation |
| CAASM | `caasm.ts` | Asset correlation and scoring |
| Metrics | `metrics.ts` | Prometheus, threat correlation |
| Graph | `graph.ts` | Security graph queries |

### Storage Layer
`IStorage` interface in `storage.ts` abstracts all database operations. `DatabaseStorage` implements it using Drizzle ORM. All routes interact with the database exclusively through this interface.

### Route Ordering
Specific routes are registered before parametric `/:id` catch-alls to prevent routing conflicts. Exposure routes are registered before attack-path `/:id` routes.

## Database Schema

### 49 Tables (grouped)

**Core (18):** organizations, users, repositories, documents, scans, scan_findings, compliance_mappings, reports, settings, audit_logs, api_keys, subscriptions, pentest_sessions, pentest_findings, cloud_scan_targets, cloud_scan_results, threat_intel_items, monitoring_configs

**SecOps (7):** incidents, vulnerabilities, sbom_items, secrets_findings, risks, attack_surface_assets, posture_scores

**Extended Modules (8):** training_records, phishing_campaigns, vendors, dark_web_alerts, remediation_tasks, bounty_reports, container_scans, container_findings

**Intelligence (6):** asset_inventory, attack_paths, threat_hunt_queries, copilot_conversations, graph_nodes, graph_edges

**Enterprise (5):** security_events, soar_playbooks, soar_executions, caasm_identities, notifications

**Team Operations (5):** incident_comments, team_activities, oncall_schedules, escalation_policies, approval_requests

**Exposure Management (2):** exposure_alerts, remediation_actions

**Enterprise Readiness (3):** siem_configs, retention_policies, workspaces

### ID Strategy
- Core tables: `serial` auto-incrementing integers
- SecOps + newer tables: `varchar` with `gen_random_uuid()` default
- All tables scoped by `orgId` for multi-tenancy

## Security Model

### Authentication
- Password hashing: bcryptjs (cost factor 10)
- Sessions: express-session with PostgreSQL backing store
- API keys: SHA-256 hashed, prefix-based lookup

### Authorization
- Organization-scoped: All data queries filter by `orgId`
- Role-based: Owner > Admin > Analyst > Viewer
- Middleware guards: `requireAuth`, `requireAdmin`, `requireAnalyst`

### Data Isolation
Multi-tenant by default. Every query includes `orgId` filter. No cross-tenant data access is possible through the storage layer.

## Deployment Architecture

### Replit (Primary)
- Single-process Node.js deployment
- PostgreSQL provisioned automatically
- TLS termination at the platform edge
- Health checks on `/api/auth/me` (or root)

### Production Considerations
- Stateless application server (session data in PostgreSQL)
- Horizontal scaling via load balancer + multiple instances
- Database connection pooling recommended for >100 concurrent users
- Static assets served from built `dist/public` directory
