# Zyra Cybersecurity Skills

Structured cybersecurity skills for AI agents, following the [agentskills.io](https://agentskills.io) standard.

## Overview

This directory contains elite-level cybersecurity skills designed for Zyra's AI agents. Each skill provides:

- **YAML Frontmatter** – Machine-readable metadata for sub-second discovery
- **Structured Workflow** – Step-by-step execution guides with decision points
- **Framework Mappings** – MITRE ATT&CK, NIST CSF 2.0, MITRE ATLAS, D3FEND, NIST AI RMF
- **Verification Criteria** – Validation steps to confirm execution success

## Available Skills

| Domain | Skill | Description |
|--------|-------|-------------|
| Threat Hunting | `hypothesis-driven-hunt` | Hypothesis-driven threat hunting using Hunter's Killer methodology |
| Malware Analysis | `static-dynamic-analysis` | Comprehensive malware analysis workflow |
| Cloud Security | `aws-azure-gcp-hardening` | Multi-cloud security hardening |
| Incident Response | `breach-containment` | Structured IR following NIST SP 800-61 |
| Security Operations | `siem-correlation` | SOC alert triage and correlation |

## Quick Start

```typescript
import { SkillLoader } from '../lib/skills-loader';

const loader = new SkillLoader('./skills');
await loader.loadSkills();

// Search for skills
const threatHuntSkills = loader.getByDomain('threat-hunting');
const dfirSkills = loader.getByTag(['dfir', 'forensics']);
const attckSkills = loader.getByFramework('mitre-attack', 'T1003');
```

## Framework Coverage

Each skill maps to multiple industry frameworks:

- **MITRE ATT&CK** (v18) – 14 tactics, 200+ techniques
- **NIST CSF 2.0** – 6 functions, 22 categories
- **MITRE ATLAS** (v5.4) – AI/ML threats
- **MITRE D3FEND** (v1.3) – Defensive countermeasures
- **NIST AI RMF** (1.0) – AI risk management

## Adding Skills

1. Create directory: `skills/<domain>/<skill-name>/`
2. Add `SKILL.md` with YAML frontmatter
3. Add `references/standards.md` for detailed framework mappings
4. Add `references/workflows.md` for deep technical procedures

## Directory Structure

```
skills/
├── index.md                    # This file
├── threat-hunting/
│   └── hypothesis-driven-hunt/
│       ├── SKILL.md
│       └── references/
│           ├── standards.md
│           └── workflows.md
├── malware-analysis/
│   └── static-dynamic-analysis/
├── cloud-security/
│   └── aws-azure-gcp-hardening/
├── incident-response/
│   └── breach-containment/
└── security-operations/
    └── siem-correlation/
```

## Sync from Upstream

To sync skills from the upstream community repository:

```bash
# Manual sync
gh workflow run sync-skills.yml -f fullSync=true

# Or wait for daily scheduled run
```

## License

Apache 2.0 – See individual skill files for details.