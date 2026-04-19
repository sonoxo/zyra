# Zyra Cybersecurity Skills Index

This file provides a catalog of all structured cybersecurity skills available for Zyra AI agents.
Each skill follows the agentskills.io standard with YAML frontmatter and structured Markdown workflows.

## Skills by Domain

| Domain | Skills | Description |
|--------|--------|-------------|
| Threat Hunting | 1 | Hypothesis-driven hunting, APT detection |
| Malware Analysis | 1 | Static/dynamic analysis, IOC extraction |
| Cloud Security | 1 | AWS/Azure/GCP hardening, CSPM |
| Incident Response | 1 | Breach containment, DFIR workflows |
| Security Operations | 1 | SIEM correlation, alert triage |

## Usage

Load skills via the Zyra Skills Loader:

```typescript
import { SkillLoader } from './lib/skills-loader';

const loader = new SkillLoader();
await loader.loadSkills();

// Query by domain
const threatHuntingSkills = loader.getByDomain('threat-hunting');

// Query by framework mapping
const attckSkills = loader.getByFramework('mitre-attack', 'T1003');

// Find skills matching tags
const forensicsSkills = loader.getByTag(['forensics', 'dfir']);
```

## Adding New Skills

1. Create directory under `skills/<domain>/<skill-name>/`
2. Add `SKILL.md` with proper YAML frontmatter
3. Add optional `references/standards.md` and `references/workflows.md`
4. Add to this index

## Framework Mappings

Each skill maps to multiple industry frameworks:

- **MITRE ATT&CK** (v18): Adversarial tactics and techniques
- **NIST CSF 2.0**: Organizational security posture
- **MITRE ATLAS** (v5.4): AI/ML adversarial threats
- **MITRE D3FEND** (v1.3): Defensive countermeasures
- **NIST AI RMF** (1.0): AI risk management

## Version

This index version: 1.0.0
Last updated: 2026-04-19