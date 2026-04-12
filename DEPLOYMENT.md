# 🚀 Zyra.Host Deployment Guide

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (Next.js) | ✅ Running | http://localhost:3000 |
| API (Fastify) | ✅ Running | http://localhost:3001 |
| Auth | ✅ Enforced | JWT on all protected routes |
| Security Scanner | ✅ Functional | Real vulnerability detection |
| Security Headers | ✅ Active | CSP, X-Frame-Options, etc. |
| Rate Limiting | ✅ Active | 100 req/min per IP |
| Billing (stub) | ⚠️ Placeholder | Needs Stripe keys |
| Database | ❌ Broken | Prisma generation failing |

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Start API
npm run dev:api

# Start Web (separate terminal)
npm run dev:web
```

## Production Deployment Checklist

### 1. Database Setup (Required)
- [ ] Provision PostgreSQL instance (Vercel Postgres, Supabase, Railway, or AWS RDS)
- [ ] Update `DATABASE_URL` in environment variables
- [ ] Run `npx prisma db push` to create tables
- [ ] Seed initial data (admin user, default org)

### 2. Secrets Configuration (Required)
Create these environment variables:

```
DATABASE_URL=postgresql://user:pass@host:5432/zyra
JWT_SECRET=<generate with: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. Stripe Integration
- [ ] Create Stripe account
- [ ] Add Pro ($49/mo) and Enterprise ($199/mo) price IDs
- [ ] Configure webhook for subscription events
- [ ] Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET

### 4. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect GitHub repo to Vercel for automatic deployments.

### 5. DNS & SSL
- [ ] Point domain to Vercel deployment
- [ ] Enable automatic SSL (Let's Encrypt via Vercel)

## API Endpoints

### Public
- `POST /api/public/scan` - Run vulnerability scan
- `GET /api/public/report/:token` - Get scan report

### Protected (Requires JWT)
- `GET /api/auth/me` - Current user info
- `GET /api/assets` - List assets
- `POST /api/scan` - Create scan
- `GET /api/incidents` - List incidents
- `GET /api/pricing/plans` - Available plans
- `POST /api/pricing/upgrade` - Upgrade plan

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes* | PostgreSQL connection string |
| JWT_SECRET | Yes | Auth secret (32+ chars) |
| STRIPE_SECRET_KEY | No* | For payments |
| FRONTEND_URL | Yes* | Production URL |
| BACKEND_URL | Yes* | API URL |

*Required for full production functionality

## Troubleshooting

### Prisma Generation Fails
- Check Node.js version (use v20 LTS)
- Try: `rm -rf node_modules/.prisma && npx prisma generate`
- If still failing, use SQLite for development: `DATABASE_URL=file:./dev.db`

### Auth Errors
- Ensure JWT_SECRET is set
- Check token hasn't expired
- Verify `Authorization: Bearer <token>` header

### Scan Not Working
- Ensure target URL is accessible
- HTTP sites will show critical vulnerability
- Check firewall allows outbound connections

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│     API     │
│  (Next.js)  │     │  (Fastify)  │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
         │  Scan   │  │  Auth   │  │Billing │
         │ Engine  │  │ JWT     │  │ Stripe │
         └─────────┘  └─────────┘  └────────┘
```

## Security Features

- ✅ JWT authentication
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Rate limiting (100 req/min)
- ✅ Input sanitization
- ✅ Protected API routes
- ⚠️ Webhook signatures (needs Stripe config)
- ⚠️ Audit logging (needs DB)

## Support

- Documentation: https://docs.zyra.host
- Discord: https://discord.gg/zyra
- Email: support@zyra.host# Deployment trigger
