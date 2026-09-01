# ZYRA / XUNIA Ecosystem — GitHub Copilot Instructions

You are editing one node of a coordinated software ecosystem owned by `sonoxo`.

## Ecosystem map

- `sonoxo/gpt-doug-llm` — orchestration, coding-agent, local-LLM and developer-control layer.
- `sonoxo/zyra` — shared credential/evidence ontology, AI/BI knowledge layer, governance contracts, and ZYRA application services.
- `sonoxo/gods-eye-viewXUNIA` — XUNIA / Glass Onion public-source spatial-intelligence application.
- `RVAI` — reserved ecosystem node. Do not invent a repository or deployment for RVAI until an actual repository is present or explicitly identified.

Treat these projects as interoperating siblings, not interchangeable repositories. Never silently move code or claims from one project into another.

## Copilot editing authority

When this repository is selected in Copilot Agent/Chat, you may edit implementation code, tests, documentation, CI/workflows, schemas, APIs, configuration, and developer tooling needed to complete the user's requested task. Prefer complete working changes over partial snippets.

You may refactor, repair, harden, document, and extend the repository. Preserve backward compatibility where practical. For changes that affect sibling repositories, define the interface/contract explicitly and identify the sibling change required. Do not pretend a cross-repository change has been made unless that repository was actually edited.

Before declaring a change complete, run or reason through the repository's relevant build, tests, type checks, linting, or validation. Do not mark failing gates as passing.

## Shared architecture contract

The intended application pathway is:

`GPT-DOUG-LLM -> ZYRA -> XUNIA / GLASS ONION -> RVAI`

This is a project/provenance relationship. It does not grant third-party permissions, government authority, or external platform access.

ZYRA owns the evidence/credential ontology. Preserve the distinction between:

- credential evidence;
- skills evidence;
- platform-access evidence;
- runtime authentication;
- runtime authorization;
- governed execution;
- audit evidence.

Never treat a badge, course, certificate, or README entry as a bearer token or authorization bypass.

## Evidence and credential rules

Use `ZYRA.README.md` and `docs/credentials/` as the canonical credential/evidence ledger when present. Do not fabricate credentials, issuers, verification IDs, dates, scores, licenses, platform entitlements, government affiliations, security clearances, certifications, customer relationships, or deployment states.

Expired credentials remain historical. Coursework is not automatically a license. Credly skill entries are not automatically certifications. Palantir training and Palantir platform access are separate evidence classes; any specific operation must still pass live authentication and authorization.

## Security rules

- Never commit secrets, tokens, passwords, cookies, private keys, OAuth credentials, API keys, payment data, or session artifacts.
- Keep security scanners fail-closed unless the user explicitly requests a documented policy change that is safe and justified.
- Do not add vulnerability suppressions merely to make CI green.
- Prefer least privilege, explicit provenance, audit logs, and human approval for privileged actions.
- Defensive cybersecurity, authorized testing, public-source analysis, and lab simulation are allowed. Do not add unauthorized exploitation, credential theft, persistence, destructive actions, real-world targeting, weapon release, or autonomous lethal functionality.

## XUNIA / Glass Onion boundary

Glass Onion is a public-source spatial-intelligence application. Preserve evidence-state labels such as `LIVE`, `DELAYED`, `RECONSTRUCTED`, `MODELED`, `PARTIAL`, and `UNAVAILABLE` when applicable. Do not represent modeled/reconstructed output as verified live intelligence. Do not add unauthorized scanning, targeting, exploitation, auto-blocking of external systems, or offensive replication.

Do not conflate `sonoxo/gods-eye-viewXUNIA` with the separate Navy SBIR mission repository `sonoxo/xuniahub`.

## Coding behavior

- Inspect existing architecture before editing.
- Reuse existing types, schemas, and abstractions when sound.
- Prefer typed interfaces and explicit error handling.
- Add or update tests for material behavior changes.
- Keep README/docs synchronized with actual code and verified evidence.
- State assumptions in code comments or PR notes when runtime evidence is unavailable.
- Never claim success for a deployment, CI run, external integration, or security gate that has not been verified.

## Cross-repository handoff format

When a task requires a sibling change that cannot be executed in the current repository, leave a concise handoff containing:

1. target repository;
2. files/contracts affected;
3. exact interface change;
4. compatibility/security impact;
5. validation required.

The objective is a coherent ecosystem with auditable boundaries, not uncontrolled code duplication.