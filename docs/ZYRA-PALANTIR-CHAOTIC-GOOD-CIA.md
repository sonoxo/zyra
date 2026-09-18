# ZYRA Palantir CHAOTIC_GOOD + CIA Ontology

Canonical ontology:

`shared/ontology/zyra-palantir-chaotic-good-cia.yaml`

## Meaning

- `CIA` = Confidentiality, Integrity, Availability.
- `CHAOTIC_GOOD` = high-variance ideation with strict governed execution.
- `GOD_MODE` = maximum configured owner-authorized capability, never a bypass of law, authentication, Palantir permissions, platform controls, third-party authorization, or required human approval.

## Execution flow

```text
Mission
  ↓
GPT-DOUG-LLM-MAX / CHAOTIC_GOOD planner
  ↓
ActionProposal
  ↓
CIA assessment
  ↓
Authorization verification
  ↓
Human approval when required
  ↓
ZYRA policy gate
  ↓
Palantir Ontology Action
  ↓
Postcondition check
  ↓
AuditEvent + EvidenceRecord
```

## Core object types

- Mission
- SystemAsset
- DataAsset
- CIAAssessment
- ActionProposal
- OntologyAction
- EvidenceRecord
- AuditEvent

## Core governed actions

- `proposeMissionAction`
- `evaluateCIAImpact`
- `approveActionProposal`
- `executeGovernedAction`
- `rollbackGovernedAction`
- `verifyPostconditions`

## Palantir bindings

The ontology is designed around OSDK, Ontology MCP, Palantir MCP, AIP Logic, Automate, AIP Evals, and AIP Evolve.

All mutations are modeled as explicit governed Ontology Actions. Direct untracked mutation is denied.

## Operational rule

`CHAOTIC_GOOD` may increase novelty and proposal diversity, but it never expands permission.

`CHAOTIC_GOOD_GOD_MODE` means:

```text
maximum configured ideation
+ maximum configured owner-authorized capability
+ strictest applicable authorization and policy rule
```
