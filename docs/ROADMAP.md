# Zyra Product Roadmap

Last updated: April 2026

## Vision

Zyra aims to be the unified cybersecurity platform that eliminates tool sprawl by consolidating vulnerability management, exposure management, compliance, and security operations into a single AI-native experience.

---

## Q2 2026 — Foundation Hardening

### Platform Stability
- [ ] End-to-end test suite (Playwright) with 80%+ coverage
- [ ] Performance benchmarks for all API endpoints
- [ ] Database query optimization and indexing
- [ ] Rate limiting and request throttling

### Security Hardening
- [ ] CSRF token implementation
- [ ] Content Security Policy headers
- [ ] API key scoping (read-only vs. read-write)
- [ ] Session rotation on privilege escalation

### Developer Experience
- [ ] OpenAPI 3.1 specification auto-generation
- [ ] SDK generation (TypeScript, Python)
- [ ] Webhook delivery system with retry logic
- [ ] CLI tool for scan management

---

## Q3 2026 — AI & Intelligence

### AI Copilot v2
- [ ] Natural language query over security data
- [ ] Automated incident summarization
- [ ] Predictive vulnerability prioritization (ML-based)
- [ ] Context-aware remediation suggestions

### Threat Intelligence
- [ ] Real-time CVE feed integration (NVD, MITRE)
- [ ] Threat actor profile database
- [ ] IOC matching engine
- [ ] STIX/TAXII feed support

### Exposure Management v2
- [ ] Live attack path simulation
- [ ] Breach probability scoring
- [ ] Asset criticality modeling
- [ ] Automated attack surface reduction recommendations

---

## Q4 2026 — Enterprise Scale

### Multi-Region
- [ ] Geo-distributed PostgreSQL (read replicas)
- [ ] Regional data residency controls
- [ ] Edge-cached static assets

### Identity & Access
- [ ] SAML 2.0 SSO integration
- [ ] OIDC provider support
- [ ] SCIM user provisioning
- [ ] Fine-grained ABAC policies

### Compliance Automation
- [ ] Continuous compliance monitoring (not point-in-time)
- [ ] Evidence collection automation
- [ ] Auditor portal with read-only access
- [ ] Custom framework builder

### Integrations
- [ ] Jira bi-directional sync
- [ ] Slack alerting with interactive actions
- [ ] PagerDuty escalation integration
- [ ] Terraform provider for Zyra resources

---

## Q1 2027 — Growth

### Self-Serve
- [ ] Usage-based billing metering
- [ ] In-app upgrade flows
- [ ] Free tier with scan limits
- [ ] Onboarding wizard v2 with guided tours

### Marketplace
- [ ] Custom playbook marketplace
- [ ] Community-contributed compliance mappings
- [ ] Third-party scanner plugin system
- [ ] Public API rate tier management

### Analytics
- [ ] Executive dashboard with PDF export
- [ ] Trend analysis and anomaly detection
- [ ] Custom report builder
- [ ] Scheduled report delivery

---

## Backlog

Items under consideration (not yet scheduled):

- Mobile app (React Native) for incident response
- Agent-based endpoint scanning
- Network topology auto-discovery
- Deception technology (honeypots)
- Purple team simulation framework
- SOC 2 Type II certification for Zyra itself
- FedRAMP authorization pathway
- Air-gapped deployment support

---

## Contributing to the Roadmap

Have a feature request? Open an issue with the `enhancement` label or start a discussion in the `Ideas` category.

Priority is determined by:
1. Customer impact and demand
2. Security criticality
3. Engineering effort and risk
4. Strategic alignment
