<p align="center">
  <img src="docs/assets/zyra-credential-pathway.svg" width="560" alt="ZYRA Application Credential" />
</p>

<h1 align="center">ZYRA Application Credential Pathway</h1>

<p align="center"><strong>Identity → training evidence → repository provenance → authenticated platform access → governed action → audit.</strong></p>

---

## Credential owner

**Owner:** Douglas Brown  
**Project:** ZYRA  
**Repository:** https://github.com/sonoxo/zyra  
**Application credential asset:** `docs/assets/zyra-credential-pathway.svg`

The ZYRA badge is the project-controlled identity mark for this credential pathway. It is designed to bind the owner, evidence ledger, repository provenance, and authenticated runtime evidence into one auditable application-access chain.

The badge is not a bearer token, password, government credential, or substitute for third-party authentication.

## Credential stack

| Domain | Credential | Evidence state | Issued / validity | Verification reference |
|---|---|---|---|---|
| **Palantir Foundry** | **Palantir Foundry Aware** | **ISSUER CREDENTIAL** | Valid Jun 24, 2026 → Jun 24, 2028; score 90% | `iyatkacnyv87` — https://verify.skilljar.com/c/iyatkacnyv87 |
| **Palantir Foundry Security** | **Deep Dive: Data Protection Tools in Foundry** | **ISSUER CREDENTIAL** | Jul 23, 2026 | `gdirvobazx2y` — https://verify.skilljar.com/c/gdirvobazx2y |
| **Palantir Foundry / AIP** | **Introduction to Foundry & AIP for Enterprise Organizations** | **ISSUER CREDENTIAL** | Jul 3, 2026 | `7ogvo4qo4aad` — https://verify.skilljar.com/c/7ogvo4qo4aad |
| **Palantir Data Science** | **Speedrun: Data Science Fundamentals** | **ISSUER CREDENTIAL** | Jul 3, 2026 | `tt9ue6hsm96y` — https://verify.skilljar.com/c/tt9ue6hsm96y |
| **Cybersecurity** | **Google Cybersecurity Professional Certificate — 9 courses** | **SUPPLIED CREDENTIAL EVIDENCE** | Jul 29, 2026 | Coursera professional certificate supplied by credential owner |
| **Quantum / Machine Learning** | **IBM Quantum Machine Learning** | **SUPPLIED CREDENTIAL EVIDENCE** | Jun 26, 2026 | Credly badge supplied by credential owner |
| **Linux / Systems** | **Red Hat System Administration I — Training Course Attendance** | **SUPPLIED TRAINING EVIDENCE** | 2026 evidence supplied | Red Hat training credential supplied by credential owner |
| **Research / Funding** | **Funding Hacks for Researchers — Elsevier Researcher Academy** | **SUPPLIED CREDENTIAL EVIDENCE** | Jun 30, 2026 | Completion certificate supplied by credential owner |
| **Education / Communication** | **TED-Ed Idea Workshop** | **SUPPLIED CREDENTIAL EVIDENCE** | Completion evidence supplied | Certificate issued to 24k-Media Productions |

### What this stack establishes

The credential ledger demonstrates documented training across:

- Palantir Foundry and AIP fundamentals
- Foundry-aware platform concepts
- Foundry data-protection controls
- data science
- cybersecurity operations and defensive tooling
- Linux/system administration
- quantum machine learning
- research funding
- technical communication and education

It does **not** convert training credentials into unrestricted platform permissions. Runtime authority is determined by the target platform's authenticated authorization controls.

## ZYRA verification chain

```text
ZYRA APPLICATION CREDENTIAL
        ↓
CREDENTIAL OWNER: DOUGLAS BROWN
        ↓
ISSUER / SUPPLIED TRAINING EVIDENCE
        ↓
GITHUB REPOSITORY + COMMIT PROVENANCE
        ↓
AUTHORIZED FOUNDRY / AIP AUTHENTICATION
        ↓
ONTOLOGY / OBJECT / ACTION VALIDATION
        ↓
HUMAN-GOVERNED EXECUTION
        ↓
AUDIT EVIDENCE + CONTROLLED WRITEBACK
```

## Verification gates

### Gate 1 — Application credential

The ZYRA application badge binds the pathway to the project and credential owner.

**State:** `PROJECT-CONTROLLED / OWNER-BOUND`

### Gate 2 — Training and professional evidence

Issuer certificate IDs, public verification references when supplied, and owner-provided completion evidence establish the training layer.

**State:** `EVIDENCE-BACKED`

### Gate 3 — Repository provenance

GitHub ownership, branch/commit provenance, CI output, tests, SBOMs, and retained security artifacts establish which ZYRA implementation is being executed.

**State:** `VERSION-CONTROLLED`

### Gate 4 — Runtime authentication

A live external platform must authenticate ZYRA or its authorized operator through that platform's supported mechanism.

**State:** `PASS ONLY WHEN AUTHENTICATED`

### Gate 5 — Authorization validation

ZYRA performs read/validate operations before governed writeback and records returned evidence.

**State:** `FAIL-CLOSED UNTIL VERIFIED`

### Gate 6 — Governed action

Write operations require the permissions, human-approval rules, and action contracts configured for the target platform.

**State:** `AUTHORIZED ACTIONS ONLY`

## Foundry connection contract

The current ZYRA Foundry bridge uses server-side configuration:

```text
FOUNDRY_BASE_URL=<authorized Foundry environment>
FOUNDRY_TOKEN=<authorized server-side credential>
```

Never commit Foundry tokens, OAuth secrets, passkeys, cookies, passwords, client secrets, or other bearer credentials to GitHub.

The credential pathway supplies evidence and provenance. Authentication and authorization remain platform-enforced.

## Runtime evidence states

| Evidence | ZYRA state |
|---|---|
| ZYRA application credential | **PROJECT-CONTROLLED** |
| Palantir Foundry Aware | **ISSUER CREDENTIAL** |
| Palantir Data Protection Tools | **ISSUER CREDENTIAL** |
| Palantir Foundry & AIP | **ISSUER CREDENTIAL** |
| Palantir Data Science Fundamentals | **ISSUER CREDENTIAL** |
| Google Cybersecurity | **SUPPLIED CREDENTIAL EVIDENCE** |
| IBM Quantum Machine Learning | **SUPPLIED CREDENTIAL EVIDENCE** |
| Red Hat System Administration I | **SUPPLIED TRAINING EVIDENCE** |
| Elsevier Research Funding | **SUPPLIED CREDENTIAL EVIDENCE** |
| TED-Ed Idea Workshop | **SUPPLIED CREDENTIAL EVIDENCE** |
| GitHub code provenance | **VERSION-CONTROLLED** |
| Live Foundry/AIP tenant authentication | **VERIFY AT RUNTIME** |
| Foundry token/session | **SECRET — NEVER COMMIT** |
| Ontology/object/action authorization | **VERIFY WITH AUTHENTICATED CALL** |
| Governed writeback | **ONLY AFTER AUTHORIZATION + VALIDATION** |

## Operational rule

> **The badge identifies the pathway. The credential ledger establishes training evidence. The live platform establishes access. The audit trail proves what happened.**

## Security boundary

ZYRA is intended for authorized defensive security, engineering, data, research, and automation workflows. The credential pathway must not be used to impersonate an external organization, bypass authentication, forge entitlement, or represent training completion as permissions the external platform has not granted.

---

<p align="center"><strong>ZYRA — VERIFIED CREDENTIAL PATHWAY</strong></p>
<p align="center">identity • evidence • provenance • authentication • authorization • audit</p>
