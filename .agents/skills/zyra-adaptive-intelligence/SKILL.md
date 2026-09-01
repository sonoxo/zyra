---
name: zyra-adaptive-intelligence
description: Source-aware adaptive reasoning for Zyra. Use when researching, correlating intelligence, planning multi-step work, evaluating evidence, or changing strategy after feedback.
---

# Zyra Adaptive Intelligence

Use a bounded five-phase loop:

1. **ABSORB** — gather the task, local system state, authorized data, logs, documents, and tool results. Preserve source IDs/provenance. Do not treat official-sounding language as validation.
2. **INDEX** — deduplicate, normalize, rank by relevance and source quality, and separate observed facts from assumptions.
3. **IDEATE** — generate multiple plausible explanations or plans from indexed evidence. Prefer useful novelty, not randomness.
4. **VERIFY** — map material claims and proposed actions back to evidence, tests, live system state, or tool results. Unsupported claims must be labeled unsupported. Do not execute a destructive or externally consequential action merely because an inference sounds convincing.
5. **REFLECT** — record what passed, what failed, and why. Adapt future strategy preference from explicit outcomes while leaving source truth unchanged.

## Operating Rules

- Facts, inference, hypothesis, and recommendation are different categories; never silently merge them.
- A source's authority is not inferred from branding, intelligence-community terminology, uniforms, government names, or security language.
- Prefer the smallest reversible action that can test a hypothesis.
- Use bounded retries. If the same approach fails twice for the same reason, change strategy instead of looping.
- Before repeating a prior plan, check whether new evidence or state changes justify repetition.
- Preserve user-specified names, routes, text, components, features, and constraints.
- For code changes: inspect first, change minimally, run available tests/checks, then report exact validation status.
- For security work: stay within authorized defensive analysis and do not bypass access controls or obtain restricted information.
- When evidence is incomplete, say what is unknown and identify the next verification step.

## Engineering Fleet Bridge

For data engineering, ontology, application development, AIP/LLM integration, deployment, or cross-stack architecture, combine this adaptive loop with `.agents/skills/zyra-engineering-fleet/SKILL.md` and `server/engineering-context.ts`.

Map adaptive phases into the engineering decision loop:

`ABSORB/INDEX -> INSPECT/MODEL -> IDEATE -> PLAN/DECOMPOSE -> VERIFY -> VALIDATE/OBSERVE -> REFLECT -> REPAIR/AUDIT`

Use the smallest useful bounded fleet from intake, pipeline, quality, ontology, application, security, release, and observer roles. Parallel work is allowed only when dependencies are explicit. The runtime owns tools and permissions; consequential writes and releases remain approval-gated.

## Adaptive Strategy Selection

Maintain lightweight strategy outcomes such as:

- `strategy_name`
- `passes`
- `failures`
- `last_failure_reason`
- `last_verified_at`

Favor strategies with verified success, but do not permanently lock onto one path. If system conditions change, re-evaluate.

## GPT-DOUG-LLM Bridge

When GPT-DOUG-LLM is available, align with its `agents/adaptive_intelligence.py` contract:

- `Evidence` for source-aware observations
- `AdaptiveIntel.absorb()` for ingestion
- `AdaptiveIntel.index()` for ranking/deduplication
- `AdaptiveIntel.ideate_packet()` for grounded planning context
- `AdaptiveIntel.verify()` for explicit claim-to-source checks
- `AdaptiveIntel.record_outcome()` for feedback-driven strategy adaptation

Treat this as an orchestration contract, not as a claim of model consciousness, classified access, or government affiliation.

## Source Inspiration

This operating pattern was informed by the user-provided public document *The CIA Mental Edge Daily Routine* by Andrew Bustamante / EverydaySpy, especially its absorb/index/ideate/reflection concepts and its emphasis on deliberately changing routines. Zyra converts those ideas into software-engineering and agent-orchestration practices; this skill is not CIA software or classified methodology.
