# Zyra Engineering Fleet

Use this skill for data engineering, ontology, application development, AIP/LLM integration, release engineering, migration, and cross-stack architecture work.

## Clean-room knowledge sources

- Palantir Learn Data Engineer guide: https://learn.palantir.com/data-engineer-guide/1388785
- Palantir Learn Application Developer guide: https://learn.palantir.com/application-developer-guide/1481796
- Palantir AI FDE overview: https://www.palantir.com/docs/foundry/ai-fde/overview/
- Palantir AI FDE modes/capabilities: https://www.palantir.com/docs/foundry/ai-fde/modes-capabilities/
- Project-owner supplied migration demo: https://www.youtube.com/watch?v=e90qUUh8_us
- Public Palantir Foundry documentation for pipelines, data expectations, ontology, application building, Workshop state/events, AIP tool context, evaluation, and governed agent workflows.

Do not copy proprietary certification-guide text or claim Palantir affiliation, certification, tenant access, private APIs, proprietary source code, model weights, or product internals.

## General fleet roles

For complex missions, assign the smallest useful bounded role set:

1. Intake — inspect sources, constraints, provenance, ownership, desired outcome.
2. Pipeline — ingestion, normalization, transforms, data products, freshness.
3. Quality — preconditions, postconditions, tests, integrity, failure policy.
4. Ontology — canonical objects, properties, links, actions, semantic contracts.
5. Application — lowest-complexity UI/workflow/API that satisfies the use case.
6. Security — least privilege, secret handling, write boundaries, abuse cases.
7. Release — CI, downstream impact, rollback, health, promotion evidence.
8. Observer — lineage, evidence, unresolved risks, task status, completion proof.

## AI FDE migration fleet

For migration objectives use the dedicated staged planner in `server/engineering-context.ts`.

`PLAN -> CONNECT -> INTERPRET -> ENHANCE -> STANDARDIZE -> VERIFY -> DEPLOY`

Assign the minimum useful migration roles:

1. `source-scout` — read-only source discovery, provenance, ownership, constraints.
2. `schema-cartographer` — read-only schema profiling, keys, relationships, nulls, lineage.
3. `code-interpreter` — read-only source/business-logic and dependency interpretation.
4. `mapping-engineer` — proposal-only mapping into XUNIA ontology/contracts/standards.
5. `transform-builder` — branch-local transforms and migration artifacts.
6. `verifier` — reconciliation, tests, evaluations, lineage and policy checks.
7. `diagnostician` — root-cause failed verification and propose a bounded repair.
8. `sme-gateway` — record authorized human decisions for ambiguity/high impact.
9. `release-controller` — approval-gated promotion, rollback and impact evidence.
10. `auditor` — append provenance, tool usage, decisions, risk and completion proof.

### Minimum-viable context

Do not dump the full repository or full data estate into every role. Provide only the typed context required for the current stage: selected schemas, selected code, target standards, ontology contracts, constraints, prior approved artifacts, and explicit tool scopes. Never infer broad access from the task name.

### Closed-loop verification

`VERIFY -> DIAGNOSE -> REPAIR_PROPOSAL -> RE_RUN -> VERIFY`

The default repair budget is three cycles. Exhaustion escalates to the SME/human gate instead of silently increasing permissions, context scope, or external effects.

## Decision loop

`INSPECT -> MODEL -> PLAN -> DECOMPOSE -> EXECUTE -> VALIDATE -> OBSERVE -> REPAIR -> APPROVE -> RELEASE -> AUDIT`

Independent roles may work in parallel only when dependencies are explicit. The runtime owns tools and permissions. Read, proposal, branch-local write, approval-gated write, and external-effect authority must remain distinguishable. Consequential external writes, destructive changes, production promotion, credentials, and payment-related operations remain approval-gated by the surrounding system.

## Data engineering rules

- Work backward from the operational ontology/workflow.
- Separate source cleanup, reusable transforms, canonical outputs, and consuming workflows.
- Treat published datasets as contracts with ownership, schema, provenance, freshness, and downstream consumers.
- Encode critical assumptions as executable quality checks and stop invalid data before it propagates.
- Prefer batch when it meets requirements; adopt incremental or streaming only when scale or latency justifies complexity.
- Include health, lineage, build evidence, incident ownership, and rollback in production design.

## Application development rules

- Start from objects, links, properties, and governed actions before UI details.
- Treat components/widgets as explicit input/output units with typed state and events.
- Route domain mutations through governed actions, not arbitrary client-side writes.
- Give LLMs only the variables, objects, searches, functions, tools, applications, and actions needed for the workflow.
- Prefer the lowest-complexity surface that meets the use case; escalate to custom code only when justified.

## Migration phase gates

Use branches/checkpoints for high-scope migration work:

- discovery inventory reviewed
- source schema and business logic interpreted
- canonical mappings reviewed
- transforms versioned
- reconciliation/evaluations pass
- sensitive-data and permission controls pass
- ambiguity resolved or explicitly accepted by an authorized human
- rollback and downstream impact reviewed
- deployment evidence recorded

## Completion gate

Do not report completion until applicable tests, data expectations, evaluations, security checks, downstream-impact checks, health checks, rollback readiness, and execution evidence are present.
