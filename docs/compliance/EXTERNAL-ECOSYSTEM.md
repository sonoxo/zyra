# ZYRA External Ecosystem & Credential Provenance

This document defines how ZYRA presents third-party company names, logos, credentials, software projects, and platform references in public materials.

## Rule

A logo is a **visual source/provenance indicator**, not proof of partnership, sponsorship, employment, authorization, clearance, certification of ZYRA, or endorsement.

ZYRA keeps these relationships separate:

| Relationship | Meaning |
|---|---|
| `CREDENTIAL_ISSUER` | Credential/training evidence exists in the ZYRA credential ledger. |
| `VERIFICATION_PLATFORM` | A third-party platform hosts or verifies credential evidence. |
| `SOFTWARE_ECOSYSTEM` | ZYRA references, integrates, or can interoperate with software from the named ecosystem. |
| `REPOSITORY_PROVENANCE` | The service is used for source, CI, audit, or artifact provenance. |
| `PLATFORM_ACCESS` | A recorded platform-access state exists; access remains controlled by that external platform. |

## Public ecosystem registry

| Organization | ZYRA relationship | Evidence / implementation basis | Public wording |
|---|---|---|---|
| **Palantir** | `CREDENTIAL_ISSUER`, `SOFTWARE_ECOSYSTEM`, `PLATFORM_ACCESS` | Issuer-verifiable Palantir Learn / Skilljar records; Foundry/AIP integration code and ontology contracts; platform access tracked separately | Credential issuer + integration target; no Palantir endorsement implied. |
| **Google** | `CREDENTIAL_ISSUER` | Google/Coursera Cybersecurity, AI, and Business Intelligence credential records in `ZYRA.README.md` | External credential issuer; credentials do not grant unrelated authorization. |
| **Coursera** | `VERIFICATION_PLATFORM` | Public verification links for multiple Google credential records | Verification/learning platform; no partnership implied. |
| **IBM** | `CREDENTIAL_ISSUER` | IBM Quantum Machine Learning / Credly and IBM SkillsBuild evidence | External credential/training issuer. |
| **Credly** | `VERIFICATION_PLATFORM` | Registered Credly profiles and badge verification references | Digital credential evidence source. |
| **Red Hat** | `CREDENTIAL_ISSUER` | Supplied System Administration I training evidence | External training issuer; evidence state remains as recorded in the ledger. |
| **Replit** | `CREDENTIAL_ISSUER`, `SOFTWARE_ECOSYSTEM` | Supplied Level 3 Proficient Builder badge artifact plus ZYRA development ecosystem use | Training/badge evidence + development ecosystem reference. |
| **Microsoft** | `SOFTWARE_ECOSYSTEM` | NXYZ Microsoft OSS layer referencing Microsoft Agent Framework, MarkItDown, and optional GraphRAG patterns | Open-source ecosystem reference; not a Microsoft credential or endorsement. |
| **GitHub** | `REPOSITORY_PROVENANCE`, `SOFTWARE_ECOSYSTEM` | Source repository, commit history, Actions/CI, CodeQL, releases and evidence links | Repository and verification infrastructure; not a credential issuer for the listed ZYRA training records. |

## Logo use requirements

1. Preserve each company's trademark/name and do not redraw it into a fake certification seal.
2. Place logos under a heading that states the relationship category.
3. Link credential claims to `ZYRA.README.md` or an issuer verification source.
4. Link software ecosystem claims to checked-in implementation or architecture documentation.
5. Never use a third-party logo beside words such as **partner**, **certified platform**, **approved**, **authorized by**, or **sponsored by** unless that status is independently documented.
6. Keep external platform permissions separate from training credentials and badges.
7. Do not infer government eligibility, security clearance, contract award status, or production access from any training credential.

## Trademark notice

Microsoft, Google, IBM, Red Hat, Palantir, Replit, GitHub, Coursera, Credly, and other third-party names and marks are the property of their respective owners. Their appearance in ZYRA documentation identifies an evidence source, software ecosystem, verification service, or external platform relationship described in this repository. **No sponsorship, partnership, certification of ZYRA, or endorsement is implied unless explicitly documented by the third party.**

## Source of truth

- Credential ledger: [`ZYRA.README.md`](../../ZYRA.README.md)
- Machine-readable external registry: [`external-ecosystem-registry.json`](external-ecosystem-registry.json)
- Microsoft OSS layer: [`../NXYZ-MICROSOFT-OSS-LAYER.md`](../NXYZ-MICROSOFT-OSS-LAYER.md)
- ContractOps evidence model: [`../../products/nxyz-contractops/README.md`](../../products/nxyz-contractops/README.md)
