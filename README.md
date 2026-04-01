# 🛡️ Zyra - AI-Native Cybersecurity Platform

Enterprise-grade AI security platform built for scale, automation, and revenue.

## 🏗️ Architecture

```
zyra-monorepo/
├── apps/
│   ├── web/          # Next.js Dashboard
│   └── api/          # Fastify API Server
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configuration
│   └── agents/       # AI Agents (Pentest, Threat Detection, etc.)
└── scripts/          # Deployment & setup scripts
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database & API keys

# Start development
npm run dev
```

- **Web Dashboard**: http://localhost:3000
- **API Server**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

## 📦 Packages

| Package | Purpose |
|---------|---------|
| `@zyra/types` | Shared TypeScript definitions |
| `@zyra/config` | Configuration & environment |
| `@zyra/agents` | AI Agents (Pentest, IR, Automation) |

## 🔐 Features

- **Multi-tenant** architecture
- **RBAC** (Admin/Analyst/Viewer)
- **Real-time** WebSocket updates
- **AI Copilot** for threat explanation & fixes
- **Stripe** billing integration
- **Docker** ready for production

## 🐳 Docker

```bash
# Production build
docker-compose up -d

# With PostgreSQL
docker-compose -f docker-compose.yml up -d
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | User authentication |
| `GET /api/assets` | List organization assets |
| `POST /api/scan` | Start security scan |
| `GET /api/threats` | List detected threats |
| `GET /api/incidents` | List incidents |
| `WS /ws` | Real-time threat feed |

## 🤖 AI Agents

- **Pentest Agent**: Automated vulnerability scanning
- **Threat Detection**: Real-time anomaly detection
- **Incident Response**: Automated containment
- **Automation**: Scheduled scans & compliance

## 📜 License

MIT © 2026 Zyra
