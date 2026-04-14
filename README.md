# 🛡️ Zyra — AI-Native Cybersecurity Platform

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Stack-Next.js-Fastify-purple" alt="Stack">
</p>

Zyra is an enterprise-grade AI-native cybersecurity platform that combines automated threat detection, AI-powered analysis, and compliance management in a single unified system.

---

## 🚀 Capabilities

### Core Features

| Feature | Description |
|---------|-------------|
| **AI Copilot** | Claude-powered threat analysis, prioritization, and remediation recommendations |
| **Automated Scanning** | Vulnerability discovery, port scanning, privacy scanning |
| **Real-time Monitoring** | WebSocket-based live threat feed |
| **Compliance** | HIPAA, SOC 2, PCI DSS, GDPR ready |
| **Integrations** | GitHub, Blockchain (ETH, Polygon, BSC), Slack, Discord |
| **Security Hardening** | SSRF protection, IP allowlisting, bot detection, webhook signing, CAPTCHA |

### Security Stack

- ✅ SSRF Protection — Blocks internal network requests
- ✅ IP Allowlisting — Restricts admin endpoints
- ✅ Bot Detection — Rate limiting + auto-lockout
- ✅ Webhook Signing — HMAC verification
- ✅ Turnstile CAPTCHA — Blocks bots on auth forms
- ✅ Input Sanitization — Prisma parameterized queries
- ✅ Audit Logging — Full action trails

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Zyra Platform                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)                                      │
│  ├── Dashboard    │ Scanner  │ Compliance │ Resources       │
└─────────────────────────────────────────────────────────────┘
          │                       ▲
          ▼                       │
┌─────────────────────────────────────────────────────────────┐
│  API Gateway (Fastify)                                      │
│  ├── /api/auth/*       — Authentication                    │
│  ├── /api/copilot/*    — AI Analysis (Claude)             │
│  ├── /api/github/*     — GitHub Security Alerts            │
│  ├── /api/blockchain/* — On-chain Monitoring               │
│  ├── /api/scan/*       — Vulnerability Scanner             │
│  └── /api/notifications/* — Discord, Slack                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Layer (Prisma + SQLite)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Packages

| Package | Purpose |
|---------|---------|
| `@zyra/agents` | AI agents (Pentest, Threat Detection, Incident Response, Copilot) |
| `@zyra/config` | Shared configuration |
| `@zyra/types` | TypeScript type definitions |
| `@zyra/integrations` | Nango-based integrations (Microsoft Defender, Okta, etc.) |
| `@zyra/notifications` | Discord, Slack alert delivery |
| `@zyra/security-scanner` | Vulnerability scanning engine |
| `@zyra/privacy-scanner` | Privacy compliance scanner |
| `@zyra/monitoring` | Health checks, metrics |

---

## 📡 API Endpoints

### AI Copilot

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/copilot/analyze-threat` | POST | AI analysis of a threat |
| `/api/copilot/prioritize` | POST | Rank threats by business risk |
| `/api/copilot/suggest-fix` | POST | Generate remediation steps |
| `/api/copilot/analyze-incident` | POST | Incident response recommendations |
| `/api/copilot/generate-report` | POST | Generate executive security report |

### GitHub Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github/security-alerts` | GET | Fetch Dependabot alerts |
| `/api/github/code-scanning-alerts` | GET | Fetch Advanced Security alerts |
| `/api/github/webhook` | POST | Receive GitHub events |

### Blockchain Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blockchain/monitor` | GET | Analyze address for suspicious activity |
| `/api/blockchain/balance` | GET | Check token balance |
| `/api/blockchain/webhook` | POST | Register for alerts |

### Security & Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/health` | GET | Health check |
| `/api/scan/vulnerability` | POST | Run vulnerability scan |

---

## 🤖 AI Copilot Usage

### Analyze a Threat

```bash
curl -X POST https://zyra.host/api/copilot/analyze-threat \
  -H "Content-Type: application/json" \
  -d '{
    "threat": {
      "title": "SQL Injection in /api/users",
      "severity": "CRITICAL",
      "category": "Injection",
      "description": "User input not sanitized in SQL query"
    }
  }'
```

### Generate a Report

```bash
curl -X POST https://zyra.host/api/copilot/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "threats": [
      { "title": "XSS in comments", "severity": "HIGH", "category": "XSS" },
      { "title": "Outdated dependency", "severity": "MEDIUM", "category": "Supply Chain" }
    ],
    "title": "Q1 2026 Security Review"
  }'
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma connection string |
| `JWT_SECRET` | Yes | Auth token secret |
| `ANTHROPIC_API_KEY` | For AI Copilot | Claude API key |
| `ETHERSCAN_API_KEY` | For blockchain | Etherscan API (free) |
| `STRIPE_SECRET_KEY` | For payments | Stripe API key |
| `DISCORD_WEBHOOK_URL` | For Discord alerts | Discord webhook |
| `SLACK_WEBHOOK_URL` | For Slack alerts | Slack webhook |
| `WEBHOOK_SECRET` | For webhook signing | HMAC secret |
| `TURNSTILE_SECRET_KEY` | For CAPTCHA | Cloudflare Turnstile |
| `ALLOWED_ADMIN_IPS` | Optional | Comma-separated IPs |

---

## 🖥️ Deployment

### Quick Start (Local)

```bash
# Clone
git clone https://github.com/sonoxo/zyra.git
cd zyra

# Install
npm install

# Build
npm run build

# Run
npm run start
```

### Replit Deployment

1. Import repo to Replit
2. Set secrets:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL`
   - etc.
3. Deploy

### Docker (Coming Soon)

```bash
docker pull zyra/zyra:latest
docker run -p 3000:3000 -p 3001:3001 zyra/zyra:latest
```

---

## 🛡️ Security

### Reporting Vulnerabilities

If you find a security issue, please email: `security@zyra.host`

### Security Features

- All inputs sanitized via Prisma parameterized queries
- Rate limiting on all endpoints
- HMAC-signed webhooks
- IP allowlisting for admin routes
- CAPTCHA on auth forms
- Full audit logging

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🐍 Stay Protected

<p align="center">
  <strong>Zyra — AI-Native Cybersecurity Platform</strong><br>
  Built with ⚡ by <a href="https://24k-media.com">24k-Media Productions</a>
</p>