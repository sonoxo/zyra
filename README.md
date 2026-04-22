<p align="center">
  <img src="https://img.shields.io/badge/Zyra-AI--Native%20Cybersecurity-7c3aed?style=for-the-badge&logo=shield&logoColor=white" alt="Zyra" />
</p>

<h1 align="center">Zyra</h1>
<p align="center"><strong>AI-Native Cybersecurity Platform</strong></p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#security">Security</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://github.com/sonoxo/zyra/releases"><img src="https://img.shields.io/github/v/release/sonoxo/zyra?style=flat-square&color=7c3aed&label=release" alt="Release" /></a>
  <a href="https://github.com/sonoxo/zyra/commits/main"><img src="https://img.shields.io/github/last-commit/sonoxo/zyra?style=flat-square&color=7c3aed&label=last%20commit" alt="Last Commit" /></a>
  <a href="https://github.com/sonoxo/zyra/commits/main"><img src="https://img.shields.io/github/commit-activity/m/sonoxo/zyra?style=flat-square&color=7c3aed&label=commits%2Fmonth" alt="Commit Activity" /></a>
  <a href="https://github.com/sonoxo/zyra/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/sonoxo/zyra/ci.yml?branch=main&style=flat-square&label=build" alt="Build" /></a>
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen?style=flat-square" alt="Coverage" />
  <img src="https://img.shields.io/badge/license-BSL--1.1-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <strong>Current Release:</strong> <code>v1.1.0</code> &nbsp;&bull;&nbsp;
  <strong>Build:</strong> <a href="https://github.com/sonoxo/zyra/commits/main"><img src="https://img.shields.io/github/sha/sonoxo/zyra?style=flat-square&label=" alt="Build SHA" /></a>
</p>

---

Zyra is an enterprise-grade, AI-native cybersecurity platform that unifies vulnerability management, exposure management, compliance automation, and security operations into a single pane of glass.

## Features

### Core Security
- **Vulnerability Scanning** — Semgrep, Trivy, Bandit, ZAP integration with severity mapping
- **AI Pentesting Agent** — Automated SQL injection, XSS, CSRF, and auth bypass testing
- **Cloud Security Posture (CSPM)** — AWS, GCP, Azure configuration auditing
- **Container & Kubernetes Security** — Image scanning and cluster compliance
- **Secrets Scanning** — Detect leaked API keys, tokens, and credentials across repos

### Exposure Management
- **Attack Path Visualization** — Interactive graph of exploitable paths with risk scoring
- **Continuous Exposure Monitoring** — Real-time alert generation with deduplication
- **Automated Remediation Engine** — 10 action types (patch, isolate, block, rotate, etc.)
- **Risk Prioritization** — Composite scoring with exploitability and business impact

### Intelligence & Operations
- **Threat Intelligence** — CVE database with auto-refresh and severity tracking
- **SIEM Integration** — Splunk, Elastic, Microsoft Sentinel, QRadar export
- **SOAR Automation** — 6 built-in playbooks with parallel execution
- **Security Copilot** — AI-assisted investigation and remediation guidance
- **CAASM** — Cyber Asset Attack Surface Management with identity correlation

### Governance & Compliance
- **Compliance Frameworks** — SOC 2, HIPAA, ISO 27001, PCI-DSS, FedRAMP, GDPR
- **DevSecOps Pipelines** — CI/CD integration with continuous monitoring
- **Vendor Risk Management** — Third-party assessment and scoring
- **Security Awareness** — Phishing simulations and training tracking

### Enterprise
- **Multi-Tenant Workspaces** — Organization-scoped data isolation
- **RBAC** — Owner, Admin, Analyst, Viewer permission matrix
- **Data Retention Policies** — Configurable retention with automated purge
- **Audit Logging** — Full activity trail with CSV export
- **SSO & API Keys** — Enterprise authentication with SHA-256 key hashing

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│   React 18 · TypeScript · Vite · Tailwind CSS   │
│   shadcn/ui · Recharts · wouter · TanStack Query│
├─────────────────────────────────────────────────┤
│                   Backend                        │
│   Express.js · TypeScript · Drizzle ORM          │
│   express-session · connect-pg-simple · bcryptjs │
├─────────────────────────────────────────────────┤
│                  Database                        │
│   PostgreSQL (49 tables)                         │
└─────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### Local Development

```bash
# Clone the repository
git clone https://github.com/zyra-security/zyra.git
cd zyra

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app starts at `http://localhost:5000` with hot reload.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Express session signing key |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for payment processing (`sk_test_...`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key for frontend (`pk_test_...`) |

### Demo Account

A demo account is available in development mode:
- Username: `demo`
- Password: `password123`

## Deployment

### Replit (Primary)
The platform is configured for one-click deployment on Replit with automatic TLS, health checks, and PostgreSQL provisioning.

### Self-Hosted
```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

See [deployment docs](docs/DEPLOYMENT.md) for Docker, Kubernetes, and cloud provider guides.

## Project Structure

```
├── client/src/
│   ├── pages/           # 46 page components
│   ├── components/      # Layout, ThemeProvider, shadcn/ui
│   ├── lib/             # Auth utilities, API client
│   └── hooks/           # Custom React hooks
├── server/
│   ├── routes.ts        # API routes (24+ feature modules)
│   ├── storage.ts       # Database storage layer (49 tables)
│   ├── exposure-manager.ts  # Exposure management engine
│   ├── enterprise.ts    # SIEM, retention, workspaces
│   ├── soar.ts          # SOAR automation engine
│   ├── caasm.ts         # CAASM engine
│   └── ...              # Additional modules
├── shared/
│   └── schema.ts        # Drizzle ORM schema + Zod types
├── .github/             # CI/CD, templates, project config
└── docs/                # Architecture, security, roadmap
```

## Contributing

We welcome contributions. Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
4. Open a Pull Request against `main`

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and review process.

## Security

Security is foundational to Zyra. If you discover a vulnerability, please report it responsibly.

- **Email**: security@zyra.dev
- **Policy**: [SECURITY.md](SECURITY.md)
- **PGP Key**: Available upon request

Do **not** open public issues for security vulnerabilities.

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for the full product roadmap organized by quarter.

## License

Copyright 2024-2026 Zyra Security, Inc.

Licensed under the [Business Source License 1.1](LICENSE). See the LICENSE file for details.

The software converts to Apache 2.0 on the Change Date specified in the LICENSE file.

---

<p align="center">Built with purpose by the Zyra team.</p>
