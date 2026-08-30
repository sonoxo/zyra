<p align="center">
  <img src="docs/assets/zyra-credential-pathway.svg" width="520" alt="ZYRA Credential Pathway identity seal" />
</p>

<h1 align="center">ZYRA Credential Pathway</h1>

<p align="center"><strong>Owner-controlled identity, training evidence, repository provenance, and live-platform authentication combined into one auditable access chain.</strong></p>

---

## Identity anchor

**Credential owner:** Douglas Brown  
**ZYRA identity mark:** `docs/assets/zyra-credential-pathway.svg`  
**Owner attestation:** Douglas Brown states that the ZYRA badge/seal used for this pathway is uniquely assigned to him.

The ZYRA seal is the project identity anchor for this pathway. It is an **internal ZYRA identity mark** and is not, by itself, proof of government employment, federal authority, or third-party platform authorization.

## Palantir training evidence

The following Palantir Learn completion credentials are used as the training-evidence layer of the pathway.

| Credential | Status | Issued | Certificate | Verification |
|---|---|---:|---|---|
| **Introduction to Foundry & AIP for Enterprise Organizations** | **COMPLETED** | July 3, 2026 | `7ogvo4qo4aad` | https://verify.skilljar.com/c/7ogvo4qo4aad |
| **Speedrun: Data Science Fundamentals** | **COMPLETED** | July 3, 2026 | `tt9ue6hsm96y` | https://verify.skilljar.com/c/tt9ue6hsm96y |

These certificates prove completion of the named Palantir Learn coursework. They are credential evidence in the ZYRA pathway; they are **not stored or treated as bearer tokens**.

## ZYRA verification chain

ZYRA treats credential verification as a chain rather than a single image check:

```text
ZYRA UNIQUE IDENTITY MARK
        ↓
PALANTIR LEARN COMPLETION EVIDENCE
        ↓
GITHUB OWNER + REPOSITORY PROVENANCE
        ↓
AUTHORIZED FOUNDRY/AIP AUTHENTICATION
        ↓
ONTOLOGY / ACTION VALIDATION
        ↓
AUDIT EVIDENCE + CONTROLLED WRITEBACK
```

### Gate 1 — ZYRA identity mark

The ZYRA badge/seal identifies the credential pathway owner inside the ZYRA project.

**State:** `OWNER-ATTESTED / PROJECT-CONTROLLED`

### Gate 2 — Palantir Learn completion

The certificate identifiers and public Skilljar verification links establish the training-completion layer.

**State:** `VERIFIED TRAINING EVIDENCE`

### Gate 3 — Repository provenance

The active GitHub repository, signed-in owner permissions, commit history, CI output, and evidence artifacts establish which ZYRA code is being executed.

**Repository:** https://github.com/sonoxo/zyra

**State:** `VERSION-CONTROLLED`

### Gate 4 — Live Foundry/AIP authentication

A live Foundry/AIP environment must still authenticate the user or application using the platform-supported identity/token mechanism.

ZYRA never substitutes an image, certificate number, or README claim for a real authenticated session.

**State:** `RUNTIME-VERIFIED WHEN AUTHENTICATION SUCCEEDS`

### Gate 5 — Ontology/action validation

Before governed writeback, ZYRA should perform a read or validate-only action and preserve the returned evidence.

**State:** `FAIL-CLOSED UNTIL VERIFIED`

## Foundry connection contract

The current ZYRA Foundry bridge expects server-side configuration such as:

```text
FOUNDRY_BASE_URL=<authorized Foundry environment>
FOUNDRY_TOKEN=<authorized server-side credential>
```

Never commit real Foundry tokens, OAuth secrets, passkeys, session cookies, passwords, or private credentials to GitHub.

The credential pathway verifies **who/what is authorized and what evidence supports the authorization**. It does not bypass Palantir authentication.

## Evidence states

| Evidence | ZYRA status |
|---|---|
| Unique ZYRA badge/seal ownership | **OWNER-ATTESTED** |
| Palantir Learn: Foundry & AIP completion | **VERIFIED** |
| Palantir Learn: Data Science Fundamentals completion | **VERIFIED** |
| GitHub repository ownership/provenance | **VERSION-CONTROLLED** |
| Foundry/AIP live tenant access | **VERIFY AT RUNTIME** |
| Foundry token/session | **SECRET — NEVER COMMIT** |
| Ontology/action access | **VERIFY WITH AUTHENTICATED CALL** |
| Governed writeback | **ONLY AFTER AUTHORIZATION + VALIDATION** |

## Operational rule

**The badge starts the pathway; the evidence chain completes it.**

For ZYRA, Douglas Brown's supplied identity badge and Palantir Learn completion credentials are recognized as project credential evidence. Live platform permissions are accepted only when the target platform confirms them through an authenticated session or API call.

## Security boundary

ZYRA is intended for authorized defensive, engineering, data, and automation workflows. Credential verification must never be used to impersonate a government agency, bypass third-party access controls, forge entitlement, or represent training completion as permissions the external platform has not actually granted.

---

<p align="center"><strong>ZYRA — identity → evidence → authentication → authorization → audit.</strong></p>
