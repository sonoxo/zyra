# ZYRA Credential Standard 2026

**Standard ID:** `ZYRA-CREDENTIAL-STANDARD-2026.09`  
**Version:** `2.0.0`  
**Status:** `OWNER_GOVERNANCE_STANDARD`  
**Last standards review:** `2026-09-22`  
**Applies to:** ZYRA, GPT-DOUG-LLM, XUNIA / GLASS ONION, RVIA, NXYZ, and owner-designated ecosystem consumers.

## Purpose

This standard defines how ZYRA records, verifies, displays, and consumes credential evidence. It also separates professional credentials from standards alignment, platform access, repository-issued project credentials, and runtime authorization.

The governing rule is:

> **Evidence is not authority. Standards alignment is not certification. A credential is not runtime permission.**

## Evidence classes

| Class | Meaning | May be displayed as a credential? | Grants runtime authority? |
|---|---|---:|---:|
| `ISSUER_VERIFIED` | Direct issuer verification or cryptographically/uniquely verifiable issuer record | Yes | No |
| `ISSUER_EVIDENCE_SUPPLIED` | Owner-supplied issuer certificate/badge with attributable evidence | Yes, with evidence state shown | No |
| `PROFILE_LISTED` | Public professional-profile listing | Historical/profile evidence only | No |
| `LIBRARY_REFERENCED` | Appears in retained professional-development records but lacks direct issuer verification in the repository | No upgrade beyond reference state | No |
| `HISTORICAL_EXPIRED` | Former credential whose validity period ended | Historical only | No |
| `PLATFORM_ENTITLEMENT` | Account, contract, tenant, workspace, or platform-access evidence | No; separate entitlement record | Only after live authorization check |
| `SKILL_EVIDENCE` | Skill label, wallet entry, assessment, or badge-derived skill | No, unless independently issued as a credential | No |
| `REPOSITORY_CREDENTIAL` | Project-issued badge/role/achievement inside the ZYRA ecosystem | Internal project credential only | No |
| `STANDARDS_ALIGNMENT` | Mapping to a public standard, framework, or guidance document | Never represented as certification | No |
| `EXTERNAL_CERTIFICATION` | Certification issued by a qualified external certification body or issuer with verifiable scope | Yes | No |

## Evidence precedence

When multiple evidence sources refer to the same credential, use the strongest verified evidence while retaining provenance for all lower-tier references.

```text
ISSUER_VERIFIED
    ↓
ISSUER_EVIDENCE_SUPPLIED
    ↓
PROFILE_LISTED / LIBRARY_REFERENCED
    ↓
UNVERIFIED CLAIM
```

No lower tier may silently promote itself to a higher tier.

## Required credential object

Each credential record SHOULD carry:

```yaml
credential:
  id: stable-project-id
  title: exact issuer title
  holder: credential owner
  issuer: exact issuer name
  evidenceClass: ISSUER_VERIFIED
  issueDate: YYYY-MM-DD
  expirationDate: YYYY-MM-DD | null
  status: ACTIVE | HISTORICAL | EXPIRED | REVOKED | UNKNOWN
  verificationUrl: https://...
  verificationId: string | null
  sourceProvenance:
    - source type
    - source location
    - observed date
  domainTags:
    - artificial-intelligence
    - cybersecurity
  standardsMappings: []
  authorizationEffect: NONE
```

## Standards-alignment object

Standards mappings are maintained outside the earned-credential count.

```yaml
standardsAlignment:
  standardId: iso-iec-42001-2023
  status: MAPPED | PARTIALLY_IMPLEMENTED | IMPLEMENTED_UNVERIFIED | VERIFIED_BY_EVIDENCE
  scope: zyra-ai-governance
  evidenceRefs: []
  externalCertification: false
```

A mapping to ISO, NIST, OWASP, MITRE, or another public framework MUST NOT be presented as issuer certification, accreditation, government approval, or a professional license.

## 2026 ZYRA standards baseline

The following sources form the current public-reference overlay for ZYRA governance as of the review date:

- **NIST AI RMF 1.0 / NIST AI 100-1** — current published baseline; NIST has announced a revision is in progress.
- **NIST AI 600-1** — Generative AI Profile companion to the AI RMF.
- **NIST CSF 2.0** — cybersecurity governance and risk outcomes.
- **NIST SP 800-207 / SP 800-207A** — zero-trust and identity-centric access control.
- **NIST SP 800-53 Rev. 5** — security and privacy control families used for crosswalks.
- **ISO/IEC 42001:2023** — AI management-system requirements.
- **ISO/IEC 23894:2023** — AI risk-management guidance.
- **ISO/IEC 42005:2025** — AI system impact-assessment guidance.
- **ISO/IEC 42006:2025** — requirements for bodies auditing/certifying AI management systems; this does not certify ZYRA.
- **OWASP Top 10 for LLM Applications 2025 / OWASP GenAI Security Project** — GenAI/LLM application security risks.
- **OWASP Top 10:2025** — general web-application security awareness baseline.
- **MITRE ATLAS** — living knowledge base for adversarial threats to AI-enabled systems.

## Project credential namespace

The owner-defined names below are project taxonomy labels, not external scientific standards, government designations, or third-party certifications:

- `AGI-S-Q`
- `SAGI-Q`
- `QAGI`
- `AI-A-I`
- `SAGI-QAGI-AI-A-I`
- `UNIVERSAL_GALACTIC_FEDERATION`
- `UNIVERSAL_GALACTICK_FEDERATION`

They may be used to group internal capability, governance, simulation, research, and agent-runtime profiles. Any badge or credential using these names MUST carry `evidenceClass: REPOSITORY_CREDENTIAL` unless a separate external issuer exists.

## Runtime authorization separation

Credential evidence may influence an eligibility review, but runtime authority MUST be determined independently from:

1. authenticated actor/workload identity;
2. target resource and data classification;
3. current platform/tenant permissions;
4. policy and legal/contractual scope;
5. action risk tier;
6. required human approval;
7. audit availability;
8. environment constraints.

The runtime decision is fail-closed when authorization evidence is missing, stale, conflicting, or unverifiable.

## LinkedIn reconciliation rule

Public professional profiles are discovery sources, not issuer authorities. A newly observed LinkedIn certification may be added as `PROFILE_LISTED` while issuer verification is pending. It may be upgraded only after issuer, verification identifier, or equivalent evidence is reconciled.

## Patent/research provenance rule

Patent publications and technical papers may inform architecture research. They are not credential issuers and do not establish permission, certification, ownership, or freedom to operate. ZYRA records the source, publication identifier, date, and the independent control objective adopted from the research.

## Audit requirements

Every credential mutation MUST record:

- prior state;
- new state;
- evidence source;
- reviewer/actor;
- timestamp;
- reason for change;
- verification outcome;
- affected downstream ontology nodes.

Secrets, account cookies, passkeys, API keys, private addresses, payment data, and authentication tokens MUST NOT be stored in public credential evidence.

## Compatibility rule

Older ZYRA ledger records remain valid under this standard. Migration changes the evidence schema and governance semantics; it does not inflate the earned-credential count.
