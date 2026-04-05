---
name: zyra-integrations
description: Zyra third-party integrations map and configuration. Use when connecting external services or debugging integration issues.
---

# Zyra Integrations

## Active Integrations

### Email — Resend
- **Secret**: `RESEND_API_KEY`
- **Domain**: zyra.host (verified in Resend dashboard)
- **Sender**: Configured via `EMAIL_FROM` env var (default: `Zyra <noreply@zyra.host>`)
- **Used for**: Email verification, password reset, notifications
- **Fallback**: If key not set, email features silently degrade (user sees "email sent" but nothing arrives)

### Payments — Stripe
- **Secrets**: `STRIPE_SECRET_KEY` (backend), `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)
- **Mode**: Stripe Checkout (test mode)
- **Plans**: Starter ($0), Professional ($99/mo), Enterprise ($499/mo)
- **Module**: `server/stripe.ts`
- **Status check**: `GET /api/stripe/status`
- **Fallback**: Without keys, plan changes apply directly without payment flow

### AI Vision — Hugging Face
- **Secret**: `HF_TOKEN`
- **Model**: `google/gemma-3-27b-it` via Hugging Face Router (OpenAI-compatible API)
- **Module**: `server/intelligence.ts` → `analyzeSecurityImage()`
- **Endpoint**: `POST /api/copilot/vision` (accepts base64 image + mimeType + optional prompt)
- **Used for**: Screenshot analysis in ZyraCopilot (phishing emails, security alerts, dashboard anomalies, dark web findings)
- **Fallback**: Returns "Vision analysis is not available" if HF_TOKEN not set

## Integration Architecture
All integrations follow the same pattern:
1. Secret stored in Replit Secrets (never in code)
2. Checked at startup via `validateEnv()` — warns if missing
3. Feature degrades gracefully if not configured
4. Status visible in Admin Panel → Environment Status

## Platform Integration Points (UI-only, not yet connected)
These pages exist in the UI but await real backend connections:
- **SIEM**: Splunk, Elastic, Sentinel config in Enterprise page
- **Cloud**: AWS, GCP, Azure scan targets in Cloud Security page
- **DevSecOps**: GitHub, GitLab pipeline configs
- **Identity**: Okta, SAML SSO in Enterprise page
- **Notifications**: Slack, webhook alert rules in DevSecOps page

## Adding a New Integration
1. Add secret name to `validateEnv()` optional list in `server/index.ts`
2. Create module or add to existing route handler in `server/routes.ts`
3. Use graceful degradation: check for secret existence before calling API
4. Add to startup banner features list in `server/index.ts`
5. Update this skill and `replit.md`
