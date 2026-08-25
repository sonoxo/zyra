# Zyra Shield

Zyra Shield is the defensive AI-agent governance boundary for the Zyra platform. It evaluates requested capabilities before execution, scans agent manifests for known high-risk patterns, and records security decisions in the existing organization-scoped audit log.

## Authorized scope

Zyra Shield is designed for defensive cybersecurity, software-supply-chain protection, AI-agent governance, secure automation, compliance, and incident response.

Weapon targeting, weapon control, autonomous firing, lethal engagement, and autonomous physical-force systems are outside the product scope and are denied by policy.

## Enforcement flow

1. Authenticate the caller.
2. Validate the request against the versioned schema.
3. Confirm that the capability is registered.
4. Compare requested scopes with the agent's declared scopes.
5. Enforce data-egress restrictions.
6. Require confirmation from the currently authenticated owner or administrator for high-impact capabilities; approval claims supplied by an unprivileged caller are never trusted.
7. Return `allow`, `review`, or `deny`.
8. Record the decision and a deterministic SHA-256 evidence hash in the audit log.

The policy is deny-by-default. Unknown capabilities, malformed requests, scope escalation, unauthorized restricted-data egress, and prohibited physical-force purposes are denied.

## API

All endpoints require a valid Zyra access token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/shield/status` | Return enforcement mode and policy version |
| `POST` | `/api/shield/evaluate` | Evaluate an agent capability request |
| `POST` | `/api/shield/scan` | Scan an agent manifest; analyst role or higher required |

`POST /api/shield/evaluate` returns:

- `200` when the policy allows the request;
- `202` when human review is required;
- `403` when the policy denies the request.

`POST /api/shield/scan` returns `422` when high or critical findings block admission. Scanner results are best-effort security signals and do not constitute a certification.

## Defense in depth

Zyra Shield complements, rather than replaces, authentication, role-based authorization, tenant isolation, CodeQL, dependency review, secret scanning, human code review, sandboxing, and runtime observability.
