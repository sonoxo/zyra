# 🛡️ Zyra - AI-Native Cybersecurity Platform

Enterprise-grade AI security platform built for scale, automation, and revenue.

## 🧠 How Zyra Works

Zyra is an AI-native security ecosystem designed to protect organizations through intelligent automation:

### 1. Connect Your Assets
- Add websites, APIs, servers, databases, containers
- Zyra automatically discovers and monitors each asset

### 2. AI-Powered Scanning
- Automated vulnerability detection
- Continuous monitoring with real-time alerts
- Security scoring (0-100) based on asset health

### 3. Threat Intelligence
- AI agents detect anomalies in real-time
- Threats are prioritized by severity
- Automated incident response when critical issues arise

### 4. Unified Dashboard
- Single pane of glass for all security data
- Live threat feed via WebSocket
- Actionable recommendations with one-click fixes

### 5. Monetization Ready
- Stripe integration for subscriptions
- Tiered pricing (Free/Pro/Enterprise)
- Usage-based billing for API access

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
