# Zyra MVP Scope — Day 1 Integrations

## Priority Matrix

| Priority | Integration | Rationale |
|----------|-------------|-----------|
| **P0** | Microsoft 365 | #1 SMB email + identity — highest signal |
| **P0** | Microsoft Defender | Native endpoint — no extra agent needed |
| **P1** | Google Workspace | Second most common SMB stack |
| **P1** | VirusTotal API | Free threat intel enrichment |
| **P2** | CrowdStrike/SentinelOne | If customer already has them |
| **P2** | AWS CloudTrail | Cloud-native customers |

---

## MVP Feature Set

### Must Have (P0)
- [ ] M365 email webhook ingestion (phishing alerts)
- [ ] Defender for Endpoint alert ingestion
- [ ] Basic investigation agent (LLM-powered triage)
- [ ] Alert dashboard (web UI)
- [ ] Slack/Telegram notifications

### Should Have (P1)
- [ ] Google Workspace email protection
- [ ] VirusTotal reputation lookup
- [ ] Auto-remediation: quarantine email, disable user
- [ ] User behavior baseline (login patterns)

### Nice to Have (P2)
- [ ] CloudTrail integration
- [ ] Network firewall logs
- [ ] Mobile app alerts

---

## Day 1 Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + Fastify (speed to market) |
| **AI** | Claude API (Anthropic) — streaming investigations |
| **Database** | PostgreSQL (Supabase) |
| **Queue** | Redis (BullMQ) for async agent processing |
| **Frontend** | Next.js + Tailwind |
| **Deployment** | Vercel + AWS Lambda (serverless agents) |

---

## Integration Complexity

| Integration | Est. Effort | Webhook/API |
|-------------|-------------|-------------|
| M365 Defender | 2 days | Graph API |
| M365 Email | 1 day | Graph API |
| Google Workspace | 3 days | Admin SDK |
| VirusTotal | 1 day | REST API |
| Slack Notifications | 1 day | Webhooks |

**MVP Timeline: 2-3 weeks**

---

## Success Criteria (MVP)

- [ ] Receives alerts from M365 + Defender
- [ ] AI agent investigates and classifies in < 30 seconds
- [ ] Dashboard shows alert history + status
- [ ] Can trigger remediation (quarantine email)
- [ ] Notifies via Slack

---

*Scope finalized: April 2026*