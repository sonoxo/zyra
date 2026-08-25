# Zyra Engineering Fleet

Use this skill for data engineering, ontology, application development, AIP/LLM integration, release engineering, and cross-stack architecture work.

## Clean-room knowledge sources

- Palantir Learn Data Engineer guide: https://learn.palantir.com/data-engineer-guide/1388785
- Palantir Learn Application Developer guide: https://learn.palantir.com/application-developer-guide/1481796
- Public Palantir Foundry documentation for pipelines, data expectations, ontology, application building, Workshop state/events, and AIP tool context.

Do not copy proprietary certification-guide text or claim Palantir affiliation, certification, tenant access, private APIs, or product internals.

## Fleet roles

For complex missions, assign the smallest useful bounded role set:

1. Intake — inspect sources, constraints, provenance, ownership, desired outcome.
2. Pipeline — ingestion, normalization, transforms, data products, freshness.
3. Quality — preconditions, postconditions, tests, integrity, failure policy.
4. Ontology — canonical objects, properties, links, actions, semantic contracts.
5. Application — lowest-complexity UI/workflow/API that satisfies the use case.
6. Security — least privilege, secret handling, write boundaries, abuse cases.
7. Release — CI, downstream impact, rollback, health, promotion evidence.
8. Observer — lineage, evidence, unresolved risks, task status, completion proof.

## Decision loop

`INSPECT -> MODEL -> PLAN -> DECOMPOSE -> EXECUTE -> VALIDATE -> OBSERVE -> REPAIR -> APPROVE -> RELEASE -> AUDIT`

Independent roles may work in parallel only when their dependencies are explicit. The runtime owns tools and permissions. Read access and write access must remain distinguishable. Consequential external writes, destructive changes, production promotion, credentials, and payment-related operations remain approval-gated by the surrounding system.

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

## Completion gate

Do not report completion until applicable tests, data expectations, security checks, downstream-impact checks, health checks, rollback readiness, and execution evidence are present.
