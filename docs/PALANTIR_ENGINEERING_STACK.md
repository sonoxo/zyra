# Zyra Palantir Engineering Stack

Zyra uses a clean-room engineering knowledge layer derived from public Palantir Learn links supplied by the project owner, public Palantir Foundry/AI FDE documentation, and public demonstrations/interviews supplied by the project owner. It does not copy certification-guide text, proprietary code, model weights, private APIs, or Palantir product assets.

## Source guides

- https://learn.palantir.com/data-engineer-guide/1388785
- https://learn.palantir.com/application-developer-guide/1481796
- https://www.palantir.com/docs/foundry/ai-fde/overview/
- https://www.palantir.com/docs/foundry/ai-fde/modes-capabilities/
- https://www.palantir.com/docs/foundry/ontology/overview
- https://www.palantir.com/docs/foundry/aip-evals/overview
- https://www.palantir.com/docs/foundry/aip-evals/experiments
- https://www.palantir.com/docs/foundry/aip-evolve/overview
- https://www.youtube.com/watch?v=e90qUUh8_us
- https://www.youtube.com/watch?v=9eUUeTC6wnY

## Stack

```text
SOURCE / INTAKE
    ↓
PIPELINE
    ↓
QUALITY / DATA EXPECTATIONS
    ↓
ONTOLOGY / BUSINESS HARNESS
objects • properties • links • actions • functions • security
    ↓
APPLICATION
state • variables • events • UI • APIs
    ↓
AIP / LLM ADAPTER
bounded context • tools • functions • governed actions
    ↓
EVALS / TRACE / FEEDBACK
representative cases • baseline • candidate • variance • regressions
    ↓
SECURITY / APPROVAL
    ↓
RELEASE / HEALTH / LINEAGE / AUDIT
```

## Sovereign business harness

The durable architecture is not the model. The durable architecture is the organization-owned harness around the model:

```text
DATA + LOGIC + ACTIONS + SECURITY = BUSINESS HARNESS
```

Zyra/Black House therefore treats models and inference providers as replaceable adapters. Changing a model/provider cannot silently change authorization, business logic, action semantics, security boundaries, or production promotion authority.

Canonical ontology:
`shared/ontology/black-house-sovereign-ai-harness.yaml`

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

## AI FDE migration fabric

The migration specialization models the public pattern as an XUNIA-native workflow:

```text
PLAN
  ↓
CONNECT
  ↓
INTERPRET
  ↓
ENHANCE
  ↓
STANDARDIZE
  ↓
VERIFY ──fail──> DIAGNOSE ──> REPAIR PROPOSAL ──> RE-RUN ──┐
  │                                                         │
  └──────────────────────────────pass<───────────────────────┘
  ↓
SME / APPROVAL GATE
  ↓
DEPLOY
  ↓
EVIDENCE / AUDIT
```

Dedicated migration roles are `source-scout`, `schema-cartographer`, `code-interpreter`, `mapping-engineer`, `transform-builder`, `verifier`, `diagnostician`, `sme-gateway`, `release-controller`, and `auditor`.

The verifier loop is deliberately bounded. The default repair budget is three cycles; exhausted or ambiguous work escalates to human/SME review instead of silently widening permissions or context.

### Minimum-viable context

Each role receives only the typed context required for its current stage. Typical context includes selected source connection metadata, schemas/data dictionaries, selected code, target standards, ontology contracts, constraints, and prior approved artifacts. Long-lived credentials and implicit broad access are excluded.

### Phase gates

Migration work uses checkpointed branches and separate authority for discovery, semantic mapping, transform writes, verification, and release. Production promotion requires rollback evidence, downstream-impact review, passed reconciliation/evaluations, and an auditable approval.

## Real-work evaluation architecture

Generic public benchmarks are useful context but are not production authority. Black House promotion decisions use workflow-specific evaluation suites built from representative work.

```text
REPRESENTATIVE CASES
      ↓
BASELINE VERSION
      ↓
CANDIDATE VERSION
      ↓
QUALITY + COST + LATENCY + VARIANCE
      ↓
REGRESSION CHECK
      ↓
SENSITIVE-DATA / CONTEXT-BOUNDARY CHECK
      ↓
EVIDENCE
      ↓
HUMAN REVIEW WHEN CONSEQUENTIAL
      ↓
PROMOTE OR REJECT
```

AIP Evals public documentation is used as a clean-room reference for test cases, evaluation criteria, run comparisons, experiments, and repeated-run variance inspection. AIP Evolve public documentation is used as a clean-room reference for bounded optimization goals, candidate changes, validation, supporting evidence, and review-before-merge patterns.

## Post-training / improvement flywheel

The Black House knowledge pattern is:

```text
OBSERVE REAL WORK
→ CAPTURE TRACE
→ COLLECT FEEDBACK
→ IDENTIFY FAILURE / COST / LATENCY TARGET
→ DEFINE BOUNDED CHANGE
→ RUN WORKFLOW-SPECIFIC EVALS
→ COMPARE TO BASELINE
→ REJECT REGRESSIONS
→ CHECK DATA BOUNDARIES
→ PRESERVE EVIDENCE
→ HUMAN REVIEW
→ PROMOTE / REJECT
→ FEED APPROVED RESULTS BACK INTO KNOWLEDGE
```

Local Black House tools implement this pattern without claiming to reproduce Palantir proprietary software. The current free continuous validator and closed-loop improver remain deterministic, model-free components that can supply evidence to this broader architecture.

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
→ EVALUATE
→ APPROVE
→ RELEASE
→ AUDIT
→ LEARN
```

The fleet is a decision-support and orchestration pattern. It does not give an LLM unrestricted execution. Tools remain explicitly bounded, read/write access stays distinguishable, consequential writes/releases follow application policy and approval gates, and completion requires evidence.

## Human augmentation principle

The default success model is **human + AI**, not autonomy for its own sake. The system should measure whether operators become faster and more accurate while preserving decision rights.

Preferred measures include:

- operator time saved;
- task accuracy;
- decision quality;
- cost per successful outcome;
- latency;
- regression rate;
- human override rate;
- unresolved exception rate.

## Application principles

- Start from the ontology/domain model before UI detail.
- Treat widgets/components as explicit input/output units with typed state and events.
- Route domain mutations through governed actions rather than arbitrary client-side writes.
- Give LLMs only the context, tools, variables, objects, functions, searches, and actions required by the current workflow.
- Prefer lower-complexity application surfaces until custom code is justified.
- Keep model/provider selection behind adapters so operational semantics remain portable.

## Data principles

- Separate source cleanup, reusable transforms, canonical/ontology outputs, and consuming workflows.
- Publish stable contracts with ownership, schema, freshness, provenance, and known downstream consumers.
- Encode critical assumptions as executable quality gates and prevent invalid data from propagating.
- Use batch unless incremental or streaming requirements justify extra operational complexity.
- Treat lineage, health, build evidence, rollback, evaluations, traces, feedback, and repair evidence as production features.
- Evaluate sensitive-data egress before context crosses a provider boundary.

This document and related Zyra/Black House implementations are clean-room applications of public engineering concepts, not Palantir Foundry components and not evidence of Palantir affiliation, endorsement, tenant access, authorization, or deployment rights.
