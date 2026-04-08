# 🛡️ Zyra — AI-Native Cybersecurity Platform

<p align="left">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-blue?style=for-the-badge" alt="Node" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge" alt="TypeScript" />
</p>

> Enterprise-grade AI security platform built for scale, automation, and revenue. Like having a sec‑ops team that never sleeps, never complains, and actually delivers results.

---

## ✨ Why Zyra?

| Feature | What It Does |
|---------|--------------|
| 🔍 **AI Vulnerability Scanner** | Real security scans — checks HTTPS, headers, exposed files, CVE references |
| 🧠 **Threat Intelligence** | Detects anomalies before they become headlines |
| 📊 **Unified Dashboard** | Single pane for all your security data |
| 💰 **Monetization Ready** | Stripe integration — go from security to revenue |
| 🔐 **Zero‑Trust Auth** | JWT-based auth with RBAC (Admin/Analyst/Viewer) |
| 🚀 **Production‑Ready** | Docker, Vercel, Railway — deploy anywhere |

Think of Zyra as your 24/7 security sidekick. It's like having a senior pentester on retainer, but cheaper and it doesn't need coffee.

---

## 🚀 Quick Start

### Option 1: Live Platform

Visit **[zyra.host](https://zyra.host)** — just open, connect assets, and start scanning. No setup required.

### Option 2: Local Dev

```bash
# Clone & enter
git clone https://github.com/sonoxo/zyra.git
cd zyra

# Install deps
npm install

# Copy env template
cp .env.example .env

# Fire it up
npm run dev
```

Then you'll see two servers:
- **Frontend (Dashboard):** http://localhost:3000
- **API (Backend):** http://localhost:3001

### Option 3: Deploy to Vercel (Frontend)

1. Fork this repo
2. Import in [Vercel](https://vercel.com)
3. Add env vars:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.vercel.app
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. Deploy 🎉

### Option 4: Deploy Full Stack (Railway/Render)

1. Fork → Railway → Add variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=<生成 with: openssl rand -base64 32>
   STRIPE_SECRET_KEY=sk_live_...
   ```
2. Deploy

> **Pro tip:** For dev, SQLite works out of the box. No DB required to test features.

---

## 🏗️ Architecture

```
zyra-monorepo/
├── apps/
│   ├── web/          # Next.js 14 Dashboard (App Router)
│   └── api/          # Fastify API Server
├── packages/
│   ├── types/        # Shared TypeScript definitions
│   ├── config/       # Environment & config
│   ├── security-scanner/  # 🎯 Our open‑source scanner
│   └── fastify-security/  # 🔒 Security middleware
└── prisma/           # Database schema (PostgreSQL)
```

---

## 📦 Open‑Source Packages

We eat our own dog food. These packages are extracted from Zyra and ready for your projects:

| Package | Install | What It Does |
|---------|---------|--------------|
| `@zyra/security-scanner` | `npm i @zyra/security-scanner` | Lightweight vulnerability scanner |
| `@zyra/fastify-security` | `npm i @zyra/fastify-security` | Headers, rate‑limit, sanitization |

```typescript
import { scan } from '@zyra/security-scanner'

const result = await scan('https://your-site.com')
console.log(result.score, result.riskLevel)
// → 85, MEDIUM
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user |

### Assets & Scans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/assets` | List / create assets |
| GET/POST | `/api/scan` | Run vulnerability scans |
| GET | `/api/public/scan` | Free public scan (no auth) |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orgs` | List orgs |
| GET | `/api/incidents` | View security incidents |

> Full API docs coming soon. But hey — it's REST. Read the code or curl it.

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind |
| API | Fastify, TypeScript |
| Auth | JWT + bcrypt |
| Database | PostgreSQL / SQLite (dev) |
| Payments | Stripe |
| Deploy | Vercel, Railway, Docker |

</div>

---

## 🤝 Contributing

1. Fork it
2. Create a feature branch (`git checkout -b cool-feature`)
3. Commit with conventional commits
4. Push & PR

All contributions welcome — whether it's a bug fix, new scanner check, or better docs.

---

## 📜 License

MIT © 2026 [Zyra](https://zyra.host)

---

<p align="center">
  <sub>Built with 🔥 by developers who care about security</sub>
</p>