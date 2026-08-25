# Zyra Ecosystem

Zyra consumes reusable engineering patterns from `sonoxo/aip-community-registry-zyra` while keeping its own application, policy, data, and deployment boundaries. The CI caller is pinned to registry commit `839a3f5e20e62603b571eee283948a7241cd18ab` so a moving registry branch cannot silently change Zyra's required gate.

## Inside

Inside Zyra, one global quality/security contract owns clean installation, tests, type checking, dependency audit, and production build. Feature pipelines such as Baseline Assurance and Job Readiness provide only their domain-specific verification instead of repeating the global pipeline.

Zyra Shield remains the deny-by-default admission boundary for agent/tool capabilities. Internal modules share organization-scoped identity, audit evidence, and policy vocabulary.

## Outside

External systems integrate through explicit APIs, authenticated events, deployment environments, and versioned registry contracts. External content and agent manifests remain untrusted until admitted by application policy.

The community registry is an external build-time dependency only. Runtime Zyra operation does not depend on registry availability.

## Upside / Upstream

Upstream inputs include dependency releases, community-registry workflow patterns, policy definitions, model/evaluation feedback, source events, and operator feedback. The AIP Evals feedback-loop pattern is adopted conceptually: durable feedback becomes evaluation input, which can expose regressions before promotion.

Upstream workflow definitions are pinned by commit SHA and dependency changes are checked by the Security Gate before downstream promotion.

## Downside / Downstream

Downstream outputs include verified application builds, deployment candidates, agent/AIP outputs, audit evidence, telemetry, evaluation cases, and release artifacts. Failed tests, type checks, high-severity dependency audits, or builds stop the promotion path.

## Pipeline contract

```text
UPSTREAM / UPSIDE
registry + dependencies + feedback + policy + events
              |
              v
          SECURITY GATE
 install -> test -> typecheck -> audit -> build
              |
       +------+------+
       |             |
       v             v
    INSIDE         OUTSIDE
 Zyra modules    APIs / events
 Shield / audit  environments
       |             |
       +------+------+
              |
              v
DOWNSTREAM / DOWNSIDE
artifacts + deployment candidates + telemetry + evals
```

The stable GitHub check name is `Security Gate`. Its result is derived from the pinned registry quality workflow and is not allowed to hide dependency-audit failures with `continue-on-error`.
