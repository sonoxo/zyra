# ZYRA // RVIA Agentic Knowledge Bridge

ZYRA agentic workflows inherit the canonical `rvia-agentic-core-v1` profile maintained in `sonoxo/gpt-doug-llm`.

Canonical profile:
`https://github.com/sonoxo/gpt-doug-llm/blob/main/safety-shield/agents/knowledge/rvia-agentic-core.json`

## ZYRA agent rule

```text
USER / EVENT
  → minimum context
  → bounded plan
  → model reasoning
  → explicit tool request
  → SHADOW GLASS policy
  → ZYRA action
  → validation / eval
  → GLASS ONION audit
```

ZYRA agents should prefer app-native deterministic functions for known operations and use LLM reasoning for ambiguity, synthesis, planning and natural-language interaction. Tool access is explicit; model output is never authority by itself.

Every new ZYRA agent should define mission, owner, inputs, outputs, allowed tools, data classes, side effects, human gate, evals, context/tool budgets, rollback and audit fields before release.

Related builder:
`https://github.com/sonoxo/gpt-doug-llm/blob/main/safety-shield/agents/agentic_builder.py`

## Black House sovereign AI harness

The Black House knowledge base now treats the **business harness** as the durable system and any model/provider as a replaceable adapter.

The harness is explicitly divided into four organization-owned planes:

```text
DATA
  +
LOGIC
  +
ACTIONS
  +
SECURITY
  =
BLACK HOUSE BUSINESS HARNESS
```

The operating rule is:

> Own the harness, not the model.

This means model changes, provider changes, prompt changes, or optimization changes must not silently change authorization, business logic, action semantics, security policy, or promotion authority.

Canonical local ontology:
`shared/ontology/black-house-sovereign-ai-harness.yaml`

Source intelligence:
`.black-house/intel/palantir-sovereign-ai-harness-2026-08-19.json`

## Real-work evaluation over generic benchmark chasing

Generic model benchmarks are supplemental evidence only. A model, prompt, function, or agent is promoted based on representative workflow evaluations tied to actual work.

```text
REAL WORK
  → REPRESENTATIVE CASES
  → BASELINE RUN
  → CANDIDATE RUN
  → QUALITY / COST / LATENCY / REGRESSION
  → SENSITIVE-DATA POLICY CHECK
  → EVIDENCE
  → HUMAN REVIEW WHEN CONSEQUENTIAL
  → PROMOTE OR REJECT
```

Important rules:

- Preserve the baseline before changing the candidate.
- Compare candidate outcomes to the baseline on the same representative cases.
- A cheaper or faster candidate is rejected when unacceptable quality or safety regressions appear.
- LLM-backed workflows should inspect run variance when nondeterminism can materially affect outcomes.
- A passing evaluation is evidence, not authority by itself.

## Closed-loop improvement flywheel

The knowledge base uses traces and feedback to improve systems without granting autonomous promotion rights:

```text
OBSERVE REAL WORK
      ↓
CAPTURE TRACE
      ↓
MEASURE OUTCOME
      ↓
COLLECT FEEDBACK
      ↓
IDENTIFY FAILURE / COST / LATENCY TARGET
      ↓
PROPOSE BOUNDED CHANGE
      ↓
RUN WORKFLOW-SPECIFIC EVALS
      ↓
COMPARE TO BASELINE
      ↓
REGRESSION + DATA BOUNDARY CHECKS
      ↓
PRESERVE EVIDENCE
      ↓
HUMAN REVIEW
      ↓
PROMOTE / REJECT
      ↓
FEED APPROVED RESULT BACK INTO KNOWLEDGE
```

This extends the existing Black House continuous-validation and closed-loop-improvement engines. The free local implementations remain deterministic, evidence-producing, and human-gated for consequential promotion.

## Sovereignty and provider boundaries

The organization owns:

- ontology and data contracts;
- business rules and functions;
- action semantics and approval requirements;
- security and context-boundary policy;
- evaluation criteria and representative test cases;
- traces, feedback, evidence, and promotion decisions.

Replaceable components include:

- model;
- model provider;
- inference endpoint;
- prompt implementation;
- optimization strategy.

Sensitive data must be checked against an explicit context/provider boundary before egress. No model provider receives implicit access because a model is configured as an adapter.

## Human augmentation rule

The Black House measures AI success by whether humans perform better, not by autonomous behavior alone. Preferred outcome measures include operator time saved, task accuracy, decision quality, cost per successful outcome, latency, regression rate, human override rate, and unresolved exception rate.

The default operating model is **human + AI with governed actions**.

## Public-source provenance

The sovereign-harness adaptation is informed by the public Aug. 19, 2026 Hans Nelson interview with Palantir's Chad Wahlquist and is reconciled where possible with Palantir's public Ontology, AIP Evals, and AIP Evolve documentation.

References to public product/tool names from an interview remain supplemental unless their semantics are corroborated in first-party documentation. Public material does not imply Palantir affiliation, authorization, tenant access, endorsement, or permission to use proprietary systems.
