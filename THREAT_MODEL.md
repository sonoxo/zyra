# Zyra Threat Model

## Security objective

Prevent an AI agent, plugin, skill, MCP-compatible integration, user, or compromised dependency from exceeding its declared authority or exposing protected data.

## Trust boundaries

- Browser and external API clients are untrusted.
- Agent manifests and natural-language instructions are untrusted input.
- Third-party models, packages, tools, webhooks, and remote content are untrusted until admitted.
- Organization identity, policy decisions, and audit evidence remain inside the Zyra trust boundary.
- Production credentials are never supplied to unapproved agent capabilities.

## Priority threats and controls

| Threat | Primary controls |
| --- | --- |
| Prompt injection | Manifest scanning, constrained tool schemas, deny-by-default policy |
| Tool or scope escalation | Declared/requested scope comparison, RBAC, human approval |
| Secret exfiltration | Pattern scanning, restricted-data egress denial, redacted evidence |
| Malicious agent skill | Admission scanning, provenance, code review, sandboxing |
| Dependency compromise | Lockfile, Dependabot, dependency review, CodeQL, SBOM/AI-BOM |
| Cross-tenant access | Organization-scoped authentication and storage queries |
| Audit tampering | Append-only application behavior and SHA-256 evidence hashes |
| Unsafe high-impact automation | Review decision and owner/admin approval requirement |
| Weapon or physical-force use | Explicit product boundary and policy denial |

## Residual risk

Static and behavioral scanners can produce false positives and false negatives. A clean scan is not proof that an agent or dependency is safe. Production changes still require human review, protected branches, least-privilege credentials, runtime isolation, and incident-response procedures.
