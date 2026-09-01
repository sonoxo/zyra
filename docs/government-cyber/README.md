# XUNIA / ZYRA U.S. Government Cyber Baseline

> **Independent implementation.** This repository is not affiliated with, sponsored by, or endorsed by the U.S. Government, Department of Defense/Department of War, NSA, CISA, NIST, DISA, or any military service. Government names and framework identifiers are used only to identify public source material.

## Purpose

This directory defines the public-source cybersecurity baseline consumed by ZYRA, XUNIA, GPT-Doug-LLM, and Virginia-LLM. It converts authoritative public guidance into a governed source registry, control mappings, workforce-role metadata, and agent safety policy.

The objective is **defensive cybersecurity, compliance engineering, secure software development, AI governance, workforce development, and auditable system operation**. It is not a military personnel database, intelligence collection system, or representation that this project has government authorization.

## Baseline stack

| Domain | Public authority | XUNIA use |
|---|---|---|
| Cyber risk governance | NIST Cybersecurity Framework 2.0 | Govern / Identify / Protect / Detect / Respond / Recover profile |
| Security controls | NIST SP 800-53 Rev. 5, current NIST control release | Control catalog and evidence model |
| Assessment | NIST SP 800-53A Rev. 5 | Assessment procedures and evidence requirements |
| CUI | NIST SP 800-171 Rev. 3 + 800-171A Rev. 3 | Optional CUI-oriented profile; never implies authorization to handle CUI |
| Machine-readable controls | NIST OSCAL | JSON/YAML/XML-compatible control representation |
| Secure SDLC | NIST SP 800-218 SSDF | CI/CD and software supply-chain gates |
| Incident response | NIST SP 800-61 Rev. 3 | Incident lifecycle and response playbooks |
| Zero Trust | NIST SP 800-207 + NSA Zero Trust Implementation Guidelines | Per-request authorization, least privilege, telemetry |
| Vulnerability priority | CISA Known Exploited Vulnerabilities | Defensive patch prioritization input |
| Baseline security | CISA Cross-Sector Cybersecurity Performance Goals | Minimum-practice profile |
| Hardening | DISA STIG/SRG public library | Technology-specific hardening checks |
| Cyber workforce | DCWF + DoDM 8140.03 | Work-role / task / KSA / qualification ontology |
| DoD-style DevSecOps | Platform One Big Bang public mirror | Architectural reference only unless separately deployed |
| AI governance | NIST AI RMF 1.0 + NIST AI 600-1 | Model inventory, evals, provenance, human oversight |

## Repository layout

```text
docs/government-cyber/
  README.md
  SAFETY-BOUNDARIES.md
  IMPLEMENTATION-BASELINE.md
  SOURCE-PROVENANCE.md

governance/usg-cyber/
  sources.yaml
  control-map.yaml
  agent-policy.yaml
  workforce-schema.json
  model-governance.yaml
```

## Operating rule

**Source -> verify -> normalize -> map -> assess -> retain evidence.**

1. Accept only public, authoritative sources listed in `governance/usg-cyber/sources.yaml`.
2. Record source URL, authority, status, publication/revision, and retrieval date.
3. Do not ingest CAC-only, CUI, classified, export-controlled, proprietary, leaked, credentialed, or accidentally exposed sensitive material.
4. Normalize public controls into internal IDs without changing the meaning of the source.
5. Keep source text separate from XUNIA implementation statements.
6. Require evidence before a control can be marked implemented.
7. Re-validate sources on a schedule; never assume a government page is permanently current.

## Compliance-status semantics

XUNIA uses these states only:

- `not_applicable` — documented scope reason exists.
- `not_implemented` — requirement is relevant and not implemented.
- `planned` — owner and target exist, but no implementation evidence yet.
- `partially_implemented` — some required evidence exists.
- `implemented_unverified` — implementation exists but has not passed independent validation.
- `verified` — evidence was evaluated against the mapped requirement.

The system MUST NOT use labels such as `DoD certified`, `FedRAMP authorized`, `CMMC certified`, `ATO`, `military approved`, or equivalent unless a real authorization/certification has been issued by the competent authority for the exact system and scope.

## Personnel boundary

DCWF/8140 data is represented as **work roles and qualification requirements**, not a roster of military personnel. Do not collect DoD IDs, CAC data, private contact information, home addresses, family details, personal schedules, non-public unit assignments, or other targeting-enabling personnel data.

## Updating this baseline

When an upstream document changes:

1. Update `sources.yaml` first.
2. Record the new revision and status (`final`, `draft`, `superseded`, etc.).
3. Compare the old and new requirements.
4. Update mappings without deleting historical evidence.
5. Open a reviewed pull request describing impact on ZYRA/XUNIA.
