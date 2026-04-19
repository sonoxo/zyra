# 🛡️ Zyra — AI-Native Cybersecurity Platform

<p align="center">
  <a href="https://zyra.ai"><img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version"></a>
  <a href="https://github.com/sonoxo/zyra/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-green" alt="License"></a>
  <a href="https://discord.gg/zyra"><img src="https://img.shields.io/badge/Discord-Zyra-purple" alt="Discord"></a>
  <img src="https://img.shields.io/badge/Stack-Next.js_14-Fastify-purple" alt="Stack">
</p>

> **Enterprise-grade AI-native security** — Built for scale. Built for defense.

Zyra is an autonomous cybersecurity platform that combines AI-driven threat detection, automated incident response, and compliance management into a single unified system. Designed for security teams that demand elite-level protection without compromise.

---

## ⚡ Why Zyra

| Capability | Description |
|------------|-------------|
| **AI Copilot** | Claude-powered threat analysis, prioritization, and remediation recommendations |
| **Automated Scanning** | Vulnerability discovery, port scanning, privacy compliance |
| **Real-time Monitoring** | WebSocket-based live threat feed with instant alerting |
| **Incident Response** | Structured IR playbooks with automated containment |
| **Threat Hunting** | Hypothesis-driven hunting using MITRE ATT&CK methodology |
| **Cloud Security** | Multi-cloud hardening (AWS, Azure, GCP) |
| **Malware Analysis** | Static/dynamic analysis with IOC extraction |
| **SOC Operations** | SIEM correlation and alert triage |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                            ZYRA PLATFORM                           │
├────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)                                             │
│  ├── Dashboard    │ Scanner  │ Compliance │ Resources │ Skills   │
└────────────────────────────────────────────────────────────────────┘
          │                                    ▲
          ▼                                    │
┌────────────────────────────────────────────────────────────────────┐
│  API Gateway (Fastify)                                             │
│  ├── /api/auth/*          — Authentication                         │
│  ├── /api/copilot/*       — AI Analysis (Claude)                  │
│  ├── /api/skills/*        — Cybersecurity Skills Engine           │
│  ├── /api/github/*        — GitHub Security Alerts                 │
│  ├── /api/blockchain/*    — On-chain Monitoring                   │
│  ├── /api/scan/*          — Vulnerability Scanner                   │
│  ├── /api/ir/*            — Incident Response                       │
│  └── /api/notifications/* — Discord, Slack, Email                 │
└────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────┐
│  Data Layer (Prisma + SQLite)                                      │
│  ├── Threat Intelligence    │ Compliance Reports   │ Audit Logs   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI Agents & Skills

Zyra integrates structured cybersecurity skills following the [agentskills.io](https://agentskills.io) standard. Each skill provides AI agents with actionable workflows mapped to industry frameworks.

### Available Skills

| Domain | Skill | Framework Coverage |
|--------|-------|---------------------|
| **Threat Hunting** | `hypothesis-driven-hunt` | ATT&CK, NIST CSF, ATLAS, D3FEND |
| **Malware Analysis** | `static-dynamic-analysis` | ATT&CK, NIST CSF, ATLAS, D3FEND |
| **Cloud Security** | `aws-azure-gcp-hardening` | CIS, NIST CSF, SOC2 |
| **Incident Response** | `breach-containment` | NIST SP 800-61, MITRE |
| **SOC Operations** | `siem-correlation` | MITRE, NIST CSF |

### Skills Usage

```typescript
import { SkillLoader } from '@zyra/skills';

// Load all cybersecurity skills
const loader = new SkillLoader('./skills');
await loader.loadSkills();

// Find skills by domain
const threatSkills = loader.getByDomain('threat-hunting');

// Query by framework mapping
const attckSkills = loader.getByFramework('mitre-attack', 'T1003');

// Search by tags
const dfirSkills = loader.getByTag(['dfir', 'forensics']);
```

---

## 📦 Packages

| Package | Purpose |
|---------|---------|
| `@zyra/agents` | AI agents (Pentest, Threat Detection, IR, Copilot) |
| `@zyra/skills` | Cybersecurity skills loader & index |
| `@zyra/config` | Shared configuration |
| `@zyra/types` | TypeScript type definitions |
| `@zyra/integrations` | Nango-based integrations (Microsoft Defender, Okta, Splunk) |
| `@zyra/notifications` | Discord, Slack, Email alert delivery |
| `@zyra/security-scanner` | Vulnerability scanning engine |
| `@zyra/privacy-scanner` | Privacy compliance scanner |
| `@zyra/monitoring` | Health checks, metrics |

---

## 🔐 Security Stack

Enterprise-grade security controls built-in:

- ✅ **SSRF Protection** — Blocks internal network requests
- ✅ **IP Allowlisting** — Restricts admin endpoints
- ✅ **Bot Detection** — Rate limiting + auto-lockout
- ✅ **Webhook Signing** — HMAC verification
- ✅ **Turnstile CAPTCHA** — Blocks bots on auth forms
- ✅ **Input Sanitization** — Prisma parameterized queries
- ✅ **Audit Logging** — Full action trails
- ✅ **Zero Trust** — BeyondCorp-style identity verification

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- SQLite (included) or PostgreSQL
- Anthropic API key (for AI Copilot)

### Installation

```bash
# Clone the repository
git clone https://github.com/sonoxo/zyra.git
cd zyra

# Install dependencies
npm install

# Build the project
npm run build

# Start the platform
npm run start
```

### Docker

```bash
# Pull the latest image
docker pull zyra/zyra:latest

# Run the container
docker run -p 3000:3000 -p 3001:3001 \
  -e DATABASE_URL="file:./dev.db" \
  -e ANTHROPIC_API_KEY="sk-..." \
  zyra/zyra:latest
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma connection string |
| `JWT_SECRET` | Yes | Auth token secret |
| `ANTHROPIC_API_KEY` | For AI | Claude API key |
| `ETHERSCAN_API_KEY` | Optional | Etherscan API |
| `STRIPE_SECRET_KEY` | Optional | Stripe for payments |
| `DISCORD_WEBHOOK_URL` | Optional | Discord alerts |
| `SLACK_WEBHOOK_URL` | Optional | Slack alerts |
| `WEBHOOK_SECRET` | Yes | HMAC signing secret |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile |
| `ALLOWED_ADMIN_IPS` | Optional | Comma-separated IPs |

---

## 🤖 API Reference

### AI Copilot

```bash
# Analyze a threat
curl -X POST https://zyra.host/api/copilot/analyze-threat \
  -H "Content-Type: application/json" \
  -d '{"threat": {"title": "SQL Injection", "severity": "CRITICAL"}}'
```

### Skills Engine

```bash
# Execute a skill
curl -X POST https://zyra.host/api/skills/execute \
  -H "Content-Type: application/json" \
  -d '{"skill": "hypothesis-driven-hunt", "params": {...}}'
```

### Incident Response

```bash
# Trigger incident response
curl -X POST https://zyra.host/api/ir/trigger \
  -H "Content-Type: application/json" \
  -d '{"incident": {"title": "Malware Detected", "severity": "HIGH"}}'
```

---

## 🛡️ Compliance

Ready for enterprise compliance requirements:

- **HIPAA** — Healthcare data protection
- **SOC 2 Type II** — Security, availability, confidentiality
- **PCI DSS** — Payment card industry standards
- **GDPR** — EU data protection
- **NIST CSF 2.0** — Cybersecurity framework
- **ISO 27001** — Information security management

---

## 📚 Documentation

- **[Skills Documentation](./skills/README.md)** — Structured cybersecurity skills for AI agents
- **[Community Resources](./docs/community-resources/README.md)** — Curated tools, guides, and references for security professionals
- **[API Reference](#api-reference)** — AI Copilot, Skills Engine, and Incident Response endpoints
- **[Architecture](./ARCHITECTURE.md)** — System design and component overview

---

## 🔐 Reporting Vulnerabilities

If you discover a security vulnerability, please report responsibly:

```
Email: security@zyra.ai
```

We follow coordinated disclosure practices and will credit researchers appropriately.

---

## 📄 License

Licensed under the **Apache License 2.0** — See [LICENSE](LICENSE)

---

## 🐍 Stay Protected

<p align="center">
  <strong>Zyra — AI-Native Cybersecurity</strong><br>
  Built for scale. Built for defense.<br>
  <br>
  <a href="https://zyra.ai">Website</a> • 
  <a href="https://discord.gg/zyra">Discord</a> • 
  <a href="https://twitter.com/zyra_ai">Twitter</a>
</p>