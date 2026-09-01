# ZYRA Eyes / RVIA Build Log

This ledger records repository-level changes for the ZYRA Eyes / Daredevil Binary Runtime. It contains no secrets, tokens, raw screenshots, or private user data.

| Entry | Date | Change | Evidence |
|---|---|---|---|
| ZYE-001 | 2026-09-01 | Project scope established from LightOrigins perception→reasoning→action reference; adapted to local desktop automation under US-CZ controls | `docs/ZYRA-EYES-RVIA.md` |
| ZYE-002 | 2026-09-01 | VA defined as Virginia runtime language; RVIA defined as GPT-DOUG-LLM-MAX + ZYRA + XUNIA + NXYZ unified runtime | `shared/ontology/rvia-vision-control.yaml` |
| ZYE-003 | 2026-09-01 | `GOD_MODE` defined as maximum owner-authorized profile, explicitly not a legal/policy/authentication bypass | `shared/ontology/rvia-vision-control.yaml` |
| ZYE-004 | 2026-09-01 | TypeScript binary vision engine implemented | `server/zyra-eyes.ts` |
| ZYE-005 | 2026-09-01 | Binary grid metrics implemented: density, transitions, centroid, brightest/darkest cell and SHA-256 frame identifier | `server/zyra-eyes.ts` |
| ZYE-006 | 2026-09-01 | One-time exact-action approval tokens implemented | `server/zyra-eyes.ts` |
| ZYE-007 | 2026-09-01 | Simulation-first API implemented; web server intentionally refuses direct native desktop execution | `server/zyra-eyes.ts` |
| ZYE-008 | 2026-09-01 | Local PyAutoGUI adapter implemented with failsafe and double opt-in for native action | `apps/zyra-eyes-plugin/zyra_eyes.py` |
| ZYE-009 | 2026-09-01 | Privacy-preserving audit model implemented: no raw screenshots, no plaintext typed text | server + local adapter |
| ZYE-010 | 2026-09-01 | Unit tests added for binary encoding, target planning, approval binding and typed-text audit privacy | `server/zyra-eyes.test.ts` |
| ZYE-011 | 2026-09-01 | Beginner architecture guide, tables and Mermaid diagrams added | `docs/ZYRA-EYES-RVIA.md` |
| ZYE-012 | 2026-09-01 | Dedicated ZYRA Eyes CI added for TypeScript, Python syntax and policy invariants | `.github/workflows/zyra-eyes-ci.yml` |
| ZYE-013 | 2026-09-01 | ZYRA Eyes routes registered in the Express control plane; API response bodies excluded from normal request logging | `server/index.ts` |
| ZYE-014 | 2026-09-01 | Main npm test suite extended to include ZYRA Eyes tests | `package.json` |
| ZYE-015 | 2026-09-01 | Authenticated beginner simulation console added at `/zyra-eyes` | `client/src/pages/zyra-eyes.tsx`, `client/src/App.tsx` |
| ZYE-016 | 2026-09-01 | Native-control and audit environment flags documented | `.env.example` |
| ZYE-017 | 2026-09-01 | US-CZ policy upgraded to v1.1 with VA, RVIA and bounded GOD_MODE semantics | `shared/policy/us-cz-ethical-scope.yaml` |
| ZYE-018 | 2026-09-01 | Whole-ecosystem beginner map added | `docs/ECOSYSTEM-BEGINNER.md` |
| ZYE-019 | 2026-09-01 | Main README updated with VA/RVIA/ZYRA Eyes architecture, product state table, CI badge, run instructions and repository map | `README.md` |
| ZYE-020 | 2026-09-01 | Final head verification observed GitHub checks running; Job Readiness Contract completed successfully while Registry Quality and CodeQL were still in progress at observation time | commit `2dd176009005654e5d3e36eee8a3a775eb8b8e0a` |
| ZYE-021 | 2026-09-01 | Added animated flagship SVG that visualizes SEE → RVIA CORE → GOVERN/ACT with scan motion, binary flow, subsystem pulses, policy state, action vector and evidence verification | `docs/assets/zyra-eyes-rvia-animated.svg` |
| ZYE-022 | 2026-09-01 | Embedded the animated showcase at the top of the ZYRA Eyes documentation and added a visual-first explanation plus bragging-rights demo language | `docs/ZYRA-EYES-RVIA.md` |
| ZYE-023 | 2026-09-01 | Rebuilt `/zyra-eyes` opening experience as a cinematic animated runtime with binary rain, live sensor scan, RVIA orbital core, four subsystem nodes, authorization stages and operating-loop visualization | `client/src/pages/zyra-eyes.tsx` |
| ZYE-024 | 2026-09-01 | Added visible product metrics to the showcase: 6 visible stages, 4 core systems, 1 human gate and 0 authorization bypasses | `client/src/pages/zyra-eyes.tsx` |

## Runtime evidence flow

```text
FRAME HASH ─┐
GRID SIZE ──┼─> PERCEPTION EVENT
DENSITY ────┤
TRANSITIONS ┘
              ↓
        PROPOSED ACTION
              ↓
       POLICY DECISION
              ↓
       HUMAN APPROVAL
              ↓
   SIMULATED / LOCAL EXECUTION
              ↓
        AUDIT METADATA
```

## Infrastructure chart

| Surface | Control | State |
|---|---|---|
| Web API | Authenticated `/api/zyra-eyes/*` routes | Implemented |
| Native OS actions | Separate local Python adapter | Implemented / disabled by default |
| Approval | One-time exact-action tokens + local per-run approval | Implemented |
| Privacy | No raw screenshot audit; no plaintext typed-text audit | Implemented |
| CI | Node typecheck/tests + Python syntax + policy invariant checks | Implemented |
| UI | `/zyra-eyes` interactive simulator + animated flagship runtime showcase | Implemented |
| Docs visual | Animated perception→reasoning→governance→action SVG | Implemented |
| Ontology | `rvia:vision-control` | Implemented |
| Governance | US-CZ v1.1 | Implemented |
| Documentation | Main README + beginner guide + plugin runbook + animated showcase | Implemented |

## Logging policy

Repository logs may record architecture changes, source paths, commit IDs, test results, policy decisions and non-sensitive operational metadata.

Runtime logs must not include:

- raw screenshot bytes;
- passwords or authentication secrets;
- browser cookies or session tokens;
- plaintext typed values from `TYPE_TEXT` actions;
- hidden credential stores;
- classified information or CUI in ordinary public-repo infrastructure.

Native runtime audit files are written outside the repository by default at `~/.zyra/eyes/native-audit.jsonl`. API audit files are written at `~/.zyra/eyes/api-audit.jsonl` unless explicitly reconfigured.

## Change discipline

Every future material ZYRA Eyes change should update this file with:

1. date;
2. component changed;
3. security/policy effect;
4. test or verification evidence;
5. migration note if an API or ontology contract changed.
