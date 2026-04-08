# Zyra Platform Stack — The Most Elite Cybersecurity SaaS

> Built for: SMBs who can't afford enterprise pricing, but deserve enterprise-grade security.
> 

---

## 🎯 The Vision

Zyra is an **agentic cybersecurity platform** that:
- Autonomously investigates threats (like 7AI)
- Proactively prevents attacks (our differentiator)
- Learns from every incident (Mem0)
- Notifies via Discord, Slack, Email, Voice

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ZYRA PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Discord    │  │   Slack      │  │   Email      │  │   Voice      │   │
│  │   (AgentMail)│  │   (Webhook)  │  │  (Resend)    │  │  (ElevenLabs)│   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     ORCHESTRATION LAYER                              │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │  │   Portkey   │ │   Langfuse  │ │    Mem0     │ │    Nango    │   │  │
│  │  │  (Observ.)  │ │ (Tracing)   │ │  (Memory)   │ │(Integrations│   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        AGENT ENGINE                                   │  │
│  │  • Claude-powered investigation                                      │  │
│  │  • Multi-agent orchestration (Endpoint, Identity, Email, Network)   │  │
│  │  • Auto-remediation workflows                                        │  │
│  │  • Learning from every alert                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Pinecone    │  │   Firecrawl  │  │    Exa       │  │    E2B       │   │
│  │  (Vectors)   │  │  (Web Intel) │  │  (Search)    │  │ (Sandbox)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      DATA LAYER                                       │  │
│  │  PostgreSQL (Prisma) │ Redis (BullMQ) │ S3 (Evidence)                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 The Stack

### 🔴 Core Infrastructure (MVP)

| Category | Tool | Purpose | Replit Compatible |
|----------|------|---------|-------------------|
| **Frontend** | Next.js 14 | Web app | ✅ Native |
| **Backend** | Node.js + Fastify | API server | ✅ Native |
| **Database** | PostgreSQL (Supabase) | Data persistence | ✅ Remote |
| **ORM** | Prisma | Database access | ✅ Native |
| **Queue** | BullMQ + Redis | Async processing | ✅ Remote (Upstash) |
| **Auth** | Clerk / NextAuth | User management | ✅ External |

### 🟠 AI & Agents (MVP)

| Category | Tool | Purpose | Notes |
|----------|------|---------|-------|
| **LLM** | Claude (Anthropic) | Investigation & reasoning | Streaming SSE |
| **Vector DB** | Pinecone | IOC embeddings, behavioral profiles | Free tier: 100K vectors |
| **Memory** | Mem0 | Learn user preferences, reduce FP | Self-hosted option |
| **Observability** | Portkey | AI tracing, debugging | Free tier |
| **RAG** | Ragie | Threat intel knowledge base | Coming soon |

### 🟡 Integrations (MVP)

| Category | Tool | Purpose | Priority |
|----------|------|---------|----------|
| **Data Integrations** | Nango | Connect M365, Defender, Okta, AWS | P0 |
| **Webhook Alerts** | Discord | Real-time SOC notifications | P0 |
| **Webhook Alerts** | Slack | Enterprise notifications | P1 |
| **Email** | Resend / AgentMail | Incident reports, alerts | P1 |
| **Threat Intel** | Firecrawl | Auto-gather CVE data | P1 |
| **Search** | Exa | Semantic threat search | P2 |

### 🟢 Advanced (Phase 2+)

| Category | Tool | Purpose | Phase |
|----------|------|---------|-------|
| **Sandbox** | E2B | Safe code execution for malware analysis | Phase 3 |
| **Browser** | Browser Use | Automate browser investigations | Phase 3 |
| **Voice** | ElevenLabs | Critical incident voice alerts | Phase 4 |
| **Voice AI** | Vapi | Voice SOC assistant | Phase 4 |
| **Tracing** | Langfuse | Detailed agent debugging | Phase 2 |
| **Sentiment** | Zep | User behavior memory | Phase 2 |

---

## 🔌 Integration Map

### Day 1 Integrations (MVP)

```typescript
// Data Sources (via Nango)
const integrations = {
  // Email & Collaboration
  microsoft_365: {
    scope: 'SecurityAlert.Read.All, Mail.Read',
    alerts: ['phishing', 'malware', 'suspicious login']
  },
  google_workspace: {
    scope: 'admin.googleapis.com',
    alerts: ['spam', 'phishing', 'data loss']
  },
  
  // Endpoint
  microsoft_defender: {
    alerts: ['malware', 'device risk', 'exploit']
  },
  crowdstrike: {
    alerts: ['threat detection', 'incident']
  },
  sentinelone: {
    alerts: ['malware', 'ransomware']
  },
  
  // Identity
  okta: {
    alerts: ['MFA bypass', 'impossible travel', 'brute force']
  },
  azure_ad: {
    alerts: ['risky sign-in', 'privilege escalation']
  },
  
  // Cloud
  aws_cloudtrail: {
    alerts: ['api calls', 'privilege misuse']
  }
}
```

### Notification Channels (Day 1)

```typescript
// Discord - Primary (free, feature-rich)
const discordNotifications = {
  events: ['new_incident', 'critical_alert', 'remediation_complete'],
  format: {
    embeds: true,
    components: ['acknowledge', 'escalate', 'dismiss']
  }
}

// Slack - Enterprise
const slackNotifications = {
  events: ['new_incident', 'critical_alert', 'daily_summary'],
  channels: {
    '#soc-alerts': 'critical',
    '#security-team': 'high',
    '# executives': 'summary'
  }
}

// Email - Executive
const emailNotifications = {
  events: ['daily_summary', 'weekly_report', 'critical_incident'],
  recipients: ['soc@company.com', 'ciso@company.com']
}
```

---

## 🛠️ Replit Compatibility

### Current Config (.replit)
```nix
{ pkgs }: {
  deps = [
    "nodejs-20"
    "npm"
  ];
}
run = "npm run dev"
modules = ["nodejs-20"]
```

### Recommended Updates for Stack

```nix
{ pkgs }: {
  deps = [
    "nodejs-20"
    "npm"
    # For local development
    pkgs.postgresql_15  # Optional: local DB for dev
    pkgs.redis          # Optional: local queue for dev
  ];
}
```

### Environment Variables Required

```bash
# Database
DATABASE_URL="postgresql://..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."
PORTKEY_API_KEY="pk-..."

# Integrations
NANGO_SECRET_KEY="nango_..."

# Vector DB
PINECONE_API_KEY="..."

# Memory
MEM0_API_KEY="..."

# Notifications
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
SLACK_WEBHOOK_URL="..."
RESEND_API_KEY="re_..."

# Threat Intel
FIRE_CRAWL_API_KEY="..."
EXA_API_KEY="..."
```

---

## 📊 Pricing Tiers (Stack-Informed)

| Feature | Starter ($99/mo) | Pro ($299/mo) | Enterprise (Custom) |
|---------|------------------|---------------|---------------------|
| Alerts/month | 1,000 | 10,000 | Unlimited |
| Data sources | 3 | 10 | Unlimited |
| Agents | 5 | 25 | Unlimited |
| Discord | ✅ | ✅ | ✅ |
| Slack | ❌ | ✅ | ✅ |
| Email reports | ❌ | ✅ | ✅ |
| Mem0 memory | Basic | Advanced | Custom |
| E2B sandbox | ❌ | ❌ | ✅ |
| Voice alerts | ❌ | ❌ | ✅ |
| Support | Email | Priority | Dedicated |

---

## 🚀 Implementation Order

### Phase 1: MVP (Weeks 1-3)
- [ ] Set up Supabase + Prisma
- [ ] Connect Nango + M365 + Defender
- [ ] Build alert ingestion API
- [ ] Implement Claude investigation agent
- [ ] Add Discord notifications
- [ ] Deploy to Vercel

### Phase 2: Scale (Weeks 4-8)
- [ ] Add Pinecone for vector storage
- [ ] Implement Mem0 for learning
- [ ] Add Portkey observability
- [ ] Connect Google Workspace
- [ ] Add Slack notifications
- [ ] Add email reports (Resend)

### Phase 3: Advanced (Weeks 9-12)
- [ ] E2B sandbox for malware analysis
- [ ] Browser Use automation
- [ ] Firecrawl threat intel
- [ ] Exa search integration

### Phase 4: Voice (2027)
- [ ] ElevenLabs voice alerts
- [ ] Vapi SOC assistant
- [ ] Mobile app

---

## 🔒 Security Considerations

| Layer | Implementation |
|-------|----------------|
| **API Keys** | All in environment variables, never in code |
| **Secrets** | Replit Secrets / AWS Secrets Manager |
| **Multi-tenant** | Row-level security in PostgreSQL |
| **Audit Logs** | All admin actions logged |
| **Data at Rest** | Supabase encryption |
| **Data in Transit** | TLS 1.3 |

---

## 📁 File Structure

```
zyra/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Fastify API
├── packages/
│   ├── agents/           # AI agent logic
│   ├── config/           # Configuration
│   └── types/            # TypeScript types
├── scripts/              # Automation scripts
├── prisma/               # Database schema
└── stacks/               # Stack documentation
    └── STACK.md          # This file
```

---

## ✅ Checklist

- [x] Next.js + Fastify + Prisma (existing)
- [x] Discord notifications (to build)
- [x] Nango integrations (to add)
- [x] Pinecone vector store (to add)
- [x] Mem0 memory (to add)
- [x] Portkey observability (to add)
- [x] Claude AI (to integrate)
- [x] Slack + Email (Phase 2)
- [x] E2B + Browser Use (Phase 3)
- [x] Voice (Phase 4)

---

*Stack finalized: April 8, 2026*
*Goal: Most elite cybersecurity SaaS for SMBs*