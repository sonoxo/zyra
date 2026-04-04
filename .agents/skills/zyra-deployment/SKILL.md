---
name: zyra-deployment
description: Zyra deployment configuration, production build, and troubleshooting. Use when deploying, publishing, or debugging production issues.
---

# Zyra Deployment

## Deployment Target
- **Type**: Autoscale (Replit Reserved VM)
- **Build**: `npm run build` (Vite frontend build + esbuild server bundle)
- **Run**: `npm run start` (serves built assets from `dist/`)
- **Domain**: zyra.host (custom domain) or `.replit.app`

## Production vs Development
| Aspect | Development | Production |
|--------|------------|------------|
| Frontend | Vite dev server (HMR) | Static from `dist/public/` |
| Server | `tsx server/index.ts` | `node dist/index.js` |
| NODE_ENV | `development` | `production` |
| Static serving | Vite middleware | `server/static.ts` → `serveStatic()` |

## Required Secrets (must be set in Replit Secrets)
- `DATABASE_URL` — PostgreSQL connection (auto-provisioned by Replit)
- `JWT_SECRET` — JWT signing key (generate strong random value)

## Optional Secrets
- `RESEND_API_KEY` — Email (verification, password reset)
- `STRIPE_SECRET_KEY` — Billing backend
- `VITE_STRIPE_PUBLISHABLE_KEY` — Billing frontend
- `BOOTSTRAP_SECRET` — Admin bootstrap endpoint protection
- `EMAIL_FROM` — Sender address (default: `Zyra <noreply@zyra.host>`)

## Health Check
- `GET /health` returns `{ status, uptime, checks: { database }, version }`
- Returns 200 if all checks pass, 503 if degraded
- Use this to verify deployment is healthy

## Troubleshooting Production
1. Check deployment logs for `FATAL`, `UNCAUGHT EXCEPTION`, `UNHANDLED REJECTION`
2. Hit `/health` to verify DB connectivity
3. Common issues:
   - Missing env vars → startup crashes with `FATAL: Missing required environment variables`
   - DB unreachable → health returns `{ status: "degraded", checks: { database: "down" } }`
   - Rate limiter crash → ensure `trust proxy` is set (already in code)

## Pre-Deployment Checklist
- [ ] All required secrets set in Replit Secrets panel
- [ ] `npm run build` succeeds without errors
- [ ] `/health` returns status "ok" after deploy
- [ ] No seed/mock data in production paths
- [ ] Email sending works (test forgot-password flow)
