# Zyra Dependencies — Package.json Additions

## Core Dependencies to Add

```json
{
  "dependencies": {
    // AI & Agents
    "@anthropic-ai/sdk": "^0.24.0",
    "@portkey-ai/gateway": "^1.0.0",
    "@mem0ai/mem0-node": "^0.1.0",
    "@pinecone-database/pinecone": "^2.0.0",
    "langfuse": "^3.0.0",
    
    // Integrations
    "@nangohq/nango": "^0.40.0",
    "discord.js": "^14.14.0",
    "@slack/web-api": "^7.0.0",
    "resend": "^3.0.0",
    
    // Queue
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    
    // Utilities
    "zod": "^3.22.0",
    "dotenv": "^16.4.0"
  }
}
```

## Install All at Once

```bash
# AI & Agents
npm install @anthropic-ai/sdk @portkey-ai/gateway @mem0ai/mem0-node @pinecone-database/pinecone langfuse

# Integrations
npm install @nangohq/nango discord.js @slack/web-api resend

# Queue & Redis
npm install bullmq ioredis

# Utilities
npm install zod dotenv
```

## Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  }
}
```

## Environment Variables Template (.env.example)

```bash
# ====== DATABASE ======
DATABASE_URL="postgresql://user:password@host:5432/zyra"

# ====== AI ======
ANTHROPIC_API_KEY="sk-ant-..."
PORTKEY_API_KEY="pk-..."
MEM0_API_KEY="mem0-..."
OPENAI_API_KEY="sk-..."

# ====== VECTOR STORE ======
PINECONE_API_KEY="pc-..."
PINECONE_ENVIRONMENT="us-east-1"
PINECONE_INDEX="zyra-vectors"

# ====== INTEGRATIONS ======
NANGO_SECRET_KEY="nango_..."
NANGO_CONNECTION_ID="zyra-main"

# ====== NOTIFICATIONS ======
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
RESEND_API_KEY="re_..."

# ====== THREAT INTEL ======
FIRE_CRAWL_API_KEY="fc-..."
EXA_API_KEY="exa-..."
VIRUSTOTAL_API_KEY="vt-..."

# ====== SANDBOX ======
E2B_API_KEY="e2b-..."

# ====== OBSERVABILITY ======
LANGFUSE_PUBLIC_KEY="pk-..."
LANGFUSE_SECRET_KEY="sk-..."
```

## Free Tier Limits

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Supabase** | 500MB DB, Auth included | Start here |
| **Upstash** | 10K commands/day | Redis alternative |
| **Pinecone** | 100K vectors | Good for MVP |
| **Portkey** | 100K traces | AI observability |
| **Nango** | 5K syncs/month | Integrations |
| **Resend** | 3K emails/mo | Transactional |
| **Exa** | 1K searches/mo | Semantic search |
| **Firecrawl** | 500 pages/mo | Threat intel |

---

*Package list: April 8, 2026*
*Run: See STACK.md in /stacks/*