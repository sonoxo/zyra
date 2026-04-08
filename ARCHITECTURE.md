# Zyra Architecture Design

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         ZYRA PLATFORM                              │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │   Web UI     │   │   Mobile     │   │    API       │           │
│  │  (Next.js)   │   │    App       │   │  (REST/WS)   │           │
│  └──────────────┘   └──────────────┘   └──────────────┘           │
│                            │                                       │
│                     ┌──────┴──────┐                                │
│                     │   Gateway   │                                │
│                     │  (Cloudflare)│                                │
│                     └──────┬──────┘                                │
│                            │                                       │
│  ┌─────────────────────────┴─────────────────────────────────┐   │
│  │                   CORE SERVICES                             │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐ │   │
│  │  │  Alert     │ │  Agent     │ │  Case      │ │ Notif   │ │   │
│  │  │  Ingestion │ │  Engine    │ │  Manager   │ │ Service │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └─────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            │                                       │
│  ┌─────────────────────────┴─────────────────────────────────┐   │
│  │                  DATA LAYER                                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────┐ │   │
│  │  │ PostgreSQL │ │   Redis    │ │  S3 / R2   │ │ Vector  │ │   │
│  │  │(Supabase)  │ │  (Queue)   │ │ (Evidence) │ │  Store  │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └─────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     INTEGRATIONS LAYER                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │   M365  │ │  Google │ │Defender │ │CrowdStrk│ │  VT     │     │
│  │   API   │ │  API    │ │  API    │ │  API    │ │  API    │     │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Alert Ingestion Service
**Purpose:** Receive security alerts from integrated tools

| Component | Technology | Function |
|-----------|------------|----------|
| Webhook Receiver | Cloudflare Workers | Receive + validate incoming alerts |
| Alert Parser | Node.js | Normalize to Zyra schema |
| Alert Router | BullMQ | Queue for processing |

**Schema:**
```typescript
interface Alert {
  id: string;
  source: 'defender' | 'm365' | 'crowdstrike' | 'sentinelone';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  indicators: string[]; // IPs, hashes, domains
  timestamp: Date;
  assets: Asset[]; // affected devices/users
}
```

### 2. Agent Engine (The Brain)
**Purpose:** Autonomous investigation + decision making

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT ENGINE                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Orchestrator (Main Agent)              ││
│  │  • Receives alert                                   ││
│  │  • Plans investigation steps                        ││
│  │  • Coordinates specialist agents                    ││
│  │  • Generates final verdict + remediation           ││
│  └─────────────────────────────────────────────────────┘│
│                        │                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Endpoint │ │ Identity │ │   Email  │ │ Network  │   │
│  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                        │                                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │            Tool Executor (Action Layer)              ││
│  │  • VirusTotal lookup    • M365 quarantine            ││
│  │  • User disable         • Endpoint isolate           ││
│  │  • Firewall block       • Slack notification         ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Prompt Engineering Strategy:**
- Each specialist agent has system prompt with domain expertise
- Orchestrator uses chain-of-thought to decompose investigation
- Evidence stored in vector DB for learning + false positive reduction

### 3. Case Manager
**Purpose:** Track incidents end-to-end

- Auto-create cases for confirmed threats
- Maintain audit trail of all investigation steps
- Allow analyst override at any point
- Generate incident reports

### 4. Notification Service
**Purpose:** Alert stakeholders

| Channel | Use Case |
|---------|----------|
| Slack | Real-time SOC alerts |
| Telegram | Mobile alerts |
| Email | Executive summaries |
| PagerDuty | Critical incidents |

---

## Data Models

### Alert
```sql
alerts (
  id uuid PRIMARY KEY,
  source varchar(50),
  source_id varchar(255),
  severity varchar(20),
  title text,
  description text,
  raw_payload jsonb,
  status enum('new', 'investigating', 'resolved', 'false_positive'),
  verdict varchar(20),
  created_at timestamptz,
  updated_at timestamptz
)
```

### Investigation
```sql
investigations (
  id uuid PRIMARY KEY,
  alert_id uuid REFERENCES alerts,
  agent_type varchar(50),
  steps jsonb, -- Each step with input/output
  verdict varchar(20),
  confidence float,
  recommendations text[],
  started_at timestamptz,
  completed_at timestamptz
)
```

### Evidence
```sql
evidence (
  id uuid PRIMARY KEY,
  investigation_id uuid REFERENCES investigations,
  type varchar(50), -- 'virustotal', 'whois', 'process_list'
  data jsonb,
  created_at timestamptz
)
```

---

## API Design

### REST Endpoints

```
GET    /api/v1/alerts              # List alerts (paginated)
GET    /api/v1/alerts/:id          # Alert detail
POST   /api/v1/alerts/:id/remediate # Trigger remediation
GET    /api/v1/investigations/:id  # Investigation details
GET    /api/v1/cases               # List cases
GET    /api/v1/health              # System health

# Webhooks (external → Zyra)
POST   /api/v1/webhooks/defender   # M365 Defender
POST   /api/v1/webhooks/crowdstrike # CrowdStrike
POST   /api/v1/webhooks/generic    # Generic webhook
```

### WebSocket
```
WS     /api/v1/ws                  # Real-time updates for dashboard
```

---

## Security Considerations

| Layer | Implementation |
|-------|----------------|
| **API Auth** | JWT + API keys per tenant |
| **Data at Rest** | AES-256 (Supabase) |
| **Data in Transit** | TLS 1.3 |
| **Secrets** | Cloudflare Secrets / AWS Secrets Manager |
| **Multi-tenant** | Row-level security in PostgreSQL |
| **Audit Logs** | All admin actions logged |

---

## Scalability Design

| Component | Scaling Strategy |
|-----------|------------------|
| Alert Ingestion | Serverless (Lambda/Workers) — auto-scale |
| Agent Engine | Queue-based (BullMQ) — horizontal workers |
| Database | Read replicas for dashboard queries |
| Vector DB | Pinecone/Weaviate for evidence embeddings |

**Target:** 10K alerts/day MVP, 1M+ at scale

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS (Production)                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   VPC Private                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │  │  ECS Fargate│  │ RDS Aurora  │  │ ElastiCache│  │  │
│  │  │  (Services) │  │ (PostgreSQL)│  │  (Redis)   │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌─────────────────────────┴───────────────────────────┐  │
│  │              CloudFront + S3 (Static)               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │ Web UI  │          │  API    │          │ Webhooks│
    │(Vercel) │          │         │          │(CF Work.)│
    └─────────┘          └─────────┘          └─────────┘
```

---

## Tech Stack Summary (Full Stack)

### Core Infrastructure
| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Next.js 14, Tailwind, Radix UI | Existing |
| **Backend** | Node.js, Fastify, TypeScript | Existing |
| **Database** | PostgreSQL (Supabase) | Free tier available |
| **ORM** | Prisma | Existing |
| **Queue** | Redis (BullMQ + Upstash) | Async agent processing |

### AI & Agents
| Layer | Technology | Notes |
|-------|------------|-------|
| **LLM** | Claude API (Anthropic) | Streaming SSE |
| **Vector DB** | Pinecone | IOC embeddings, behavior |
| **Memory** | Mem0 | Learn from incidents |
| **Observability** | Portkey | AI tracing |
| **RAG** | Ragie | Threat intel KB |

### Integrations
| Layer | Technology | Notes |
|-------|------------|-------|
| **Data Sources** | Nango | M365, Defender, Okta, AWS |
| **Discord** | AgentMail / Webhook | SOC notifications |
| **Slack** | Webhook | Enterprise alerts |
| **Email** | Resend | Reports |
| **Threat Intel** | Firecrawl + Exa | Auto-gather CVEs |

### Advanced (Phase 3+)
| Layer | Technology | Notes |
|-------|------------|-------|
| **Sandbox** | E2B | Malware analysis |
| **Browser** | Browser Use | Automation |
| **Voice** | ElevenLabs + Vapi | Alerts |

### Infra & DevOps
| Layer | Technology | Notes |
|-------|------------|-------|
| **Hosting** | Vercel + AWS | Production |
| **CI/CD** | GitHub Actions | Existing |
| **Secrets** | Replit Secrets / AWS SM | Existing |

---

*Architecture finalized: April 2026*