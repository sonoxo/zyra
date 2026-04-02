# 🛡️ Zyra - AI-Native Cybersecurity Platform

Enterprise-grade AI security platform built for scale, automation, and revenue.

---

## 🚀 How to Get Started

### Option 1: Use the Live Platform
**URL:** https://zyra.host

Simply visit https://zyra.host to start using Zyra immediately.

---

### Option 2: Self-Hosted (Download & Deploy)

#### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL (optional for dev, SQLite works)

#### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/sonoxo/zyra.git
cd zyra

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your settings

# 4. Start development
npm run dev
```

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001

---

### Option 3: Deploy to Vercel (Frontend)

1. Go to [Vercel](https://vercel.com)
2. Import `sonoxo/zyra` from GitHub
3. Add environment variables in Settings → Environment Variables:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_FRONTEND_URL`
4. Deploy

---

### Option 4: Deploy to Railway/Fly.io (Backend)

1. Fork the repo to your GitHub
2. Connect repo to Railway
3. Add environment variables:
   - `STRIPE_SECRET_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Deploy

---

## 🧠 How Zyra Works

1. **Connect Your Assets** — Add websites, APIs, servers, databases
2. **AI-Powered Scanning** — Automated vulnerability detection
3. **Threat Intelligence** — Real-time anomaly detection
4. **Unified Dashboard** — Single pane for all security data
5. **Monetization Ready** — Stripe integration for subscriptions

---

## 🏗️ Architecture

```
zyra-monorepo/
├── apps/
│   ├── web/          # Next.js Dashboard
│   └── api/          # Fastify API Server
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configuration
│   └── agents/       # AI Agents
└── prisma/           # Database schema
```

---

## 📦 Packages

| Package | Purpose |
|---------|---------|
| `@zyra/types` | Shared TypeScript definitions |
| `@zyra/config` | Configuration & environment |
| `@zyra/agents` | AI Agents (Pentest, Threat Detection, IR) |

---

## 🔐 Features

- JWT Authentication (register, login, sessions)
- Profiles & Follow system
- Live streaming infrastructure
- Real-time chat (WebSocket ready)
- Stripe payments integration
- RBAC (Admin/Analyst/Viewer/Creator)
- Docker ready for production

---

## 🐳 Docker

```bash
# Production build
docker-compose up -d
```

---

## 🤖 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Get JWT token |
| `GET /api/profiles/:id` | Get user profile |
| `GET /api/streams` | List live streams |
| `POST /api/stripe/create-checkout-session` | Create payment |

---

## 💳 Stripe Integration

Add in `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📜 License

MIT © 2026 Zyra
