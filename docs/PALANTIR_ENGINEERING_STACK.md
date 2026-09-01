# Zyra Palantir Engineering Stack

Zyra uses a clean-room engineering knowledge layer derived from public Palantir Learn links supplied by the project owner and public Palantir Foundry documentation. It does not copy certification-guide text, proprietary code, private APIs, or Palantir product assets.

## Source guides

- https://learn.palantir.com/data-engineer-guide/1388785
- https://learn.palantir.com/application-developer-guide/1481796

## Stack

```text
SOURCE / INTAKE
    ↓
PIPELINE
    ↓
QUALITY / DATA EXPECTATIONS
    ↓
ONTOLOGY
objects • properties • links • actions
    ↓
APPLICATION
state • variables • events • UI • APIs
    ↓
AIP / LLM
bounded context • tools • functions • governed actions
    ↓
SECURITY / APPROVAL
    ↓
RELEASE / HEALTH / LINEAGE / AUDIT
```

## Agentic fleet

Zyra decomposes complex engineering work into bounded specialist roles:

- `intake`: sources, provenance, constraints, ownership, outcome
- `pipeline`: ingestion, normalization, transforms, freshness, publication
- `quality`: tests, expectations, invariants, fail policy
- `ontology`: canonical objects, properties, links, actions
- `application`: lowest-complexity UI/workflow/API implementation
- `security`: least privilege, boundaries, secrets, write controls
- `release`: CI, health, downstream impact, rollback, promotion
- `observer`: lineage, evidence, unresolved risk, completion status

The deterministic shared context is implemented in `server/engineering-context.ts`.

## Decision loop

```text
INSPECT
→ MODEL
→ PLAN
→ DECOMPOSE
→ EXECUTE
→ VALIDATE
→ OBSERVE
→ REPAIR
→ APPROVE
→ RELEASE
→ AUDIT
```

The fleet is a decision-support and orchestration pattern. It does not give an LLM unrestricted execution. Tools remain explicitly bounded, read/write access stays distinguishable, consequential writes/releases follow application policy and approval gates, and completion requires evidence.

## Application principles

- Start from the ontology/domain model before UI detail.
- Treat widgets/components as explicit input/output units with typed state and events.
- Route domain mutations through governed actions rather than arbitrary client-side writes.
- Give LLMs only the context, tools, variables, objects, functions, searches, and actions required by the current workflow.
- Prefer lower-complexity application surfaces until custom code is justified.

## Data principles

- Separate source cleanup, reusable transforms, canonical/ontology outputs, and consuming workflows.
- Publish stable contracts with ownership, schema, freshness, provenance, and known downstream consumers.
- Encode critical assumptions as executable quality gates and prevent invalid data from propagating.
- Use batch unless incremental or streaming requirements justify extra operational complexity.
- Treat lineage, health, build evidence, and rollback as production features.

This document and `server/engineering-context.ts` are XUNIA/Zyra implementations of public engineering concepts, not Palantir Foundry components and not evidence of Palantir affiliation or tenant access.
