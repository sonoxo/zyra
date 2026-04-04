---
name: zyra-architecture
description: Zyra platform architecture, module map, and conventions. Use when making structural changes, adding features, or understanding how modules connect.
---

# Zyra Architecture

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts + wouter
- Backend: Express.js + TypeScript
- Database: PostgreSQL via Drizzle ORM (50 tables)
- Auth: JWT (access 15m + refresh 7d) + bcryptjs + RBAC (owner > admin > analyst > viewer)

## Server Modules
| File | Responsibility |
|------|---------------|
| `index.ts` | Express setup, env validation, process handlers, health, startup banner |
| `routes.ts` | All API route registration (24 feature modules) |
| `auth.ts` | JWT middleware: `requireAuth`, `requireRole`, token gen/verify |
| `storage.ts` | `DatabaseStorage` implementing `IStorage` — all DB operations |
| `intelligence.ts` | ZyraCopilot engine, CVE database, threat correlation |
| `metrics.ts` | Prometheus-style counters/histograms, request middleware |
| `caasm.ts` | CAASM risk scoring, identity correlation, API routes |
| `enterprise.ts` | SIEM configs, retention policies, workspaces |
| `team-ops.ts` | Activity feed, on-call, escalation policies, approvals |
| `exposure-manager.ts` | Attack path graph, exposure monitoring, remediation |
| `task-runner.ts` | Agent task execution (scan, playbook, remediation, audit) |
| `stripe.ts` | Stripe Checkout sessions, graceful degradation |
| `soar.ts` | SOAR playbook execution engine |

## Adding a New Feature
1. Add table(s) to `shared/schema.ts` with insert schema + types
2. Add CRUD methods to `IStorage` interface and `DatabaseStorage` in `server/storage.ts`
3. Add API routes in `server/routes.ts` (use `requireAuth`, validate with Zod)
4. Add page in `client/src/pages/`, register route in `client/src/App.tsx`
5. Add sidebar entry in `client/src/components/layout/sidebar.tsx`
6. Use TanStack Query v5 (object form only) for data fetching
7. Add `data-testid` attributes to all interactive and display elements

## Critical Conventions
- `apiRequest(method, url, data?)` returns `Response` — call `.json()` to parse
- Never inject seed/mock data in route handlers — pages must handle empty states
- DB schema changes: use direct SQL or `npm run db:push` — never `drizzle-kit push` interactively
- `app.set("trust proxy", 1)` is required — do not remove
- All ID columns: preserve existing type (serial or varchar UUID)
