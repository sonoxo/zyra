# GitHub Project Board Setup

## Board: Zyra Platform

Create a GitHub Projects (v2) board at the organization level for cross-cutting visibility.

### Views

#### 1. Board View (Default)
Columns:
| Column | Description |
|--------|-------------|
| Backlog | Accepted but not started |
| Ready | Groomed and ready for sprint |
| In Progress | Actively being worked on |
| In Review | PR open, awaiting review |
| Done | Merged and verified |

#### 2. Roadmap View
Timeline view grouped by milestone, showing feature delivery dates.

#### 3. Team View
Board view grouped by assignee for workload visibility.

### Labels

#### Priority
| Label | Color | Description |
|-------|-------|-------------|
| `P0-critical` | `#b60205` | Security vulnerability or production outage |
| `P1-high` | `#d93f0b` | Blocks release or major feature |
| `P2-medium` | `#fbca04` | Important but not blocking |
| `P3-low` | `#0e8a16` | Nice to have |

#### Type
| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or improvement |
| `documentation` | `#0075ca` | Documentation updates |
| `security` | `#e11d48` | Security-related issue |
| `performance` | `#7057ff` | Performance improvement |
| `tech-debt` | `#b4befe` | Code quality and maintenance |
| `dependencies` | `#0366d6` | Dependency updates |
| `automated` | `#ededed` | Automated PR (Dependabot, etc.) |
| `ci` | `#bfdadc` | CI/CD pipeline changes |

#### Module
| Label | Color | Description |
|-------|-------|-------------|
| `module:exposure` | `#7c3aed` | Exposure Management |
| `module:scanning` | `#7c3aed` | Vulnerability Scanning |
| `module:compliance` | `#7c3aed` | Compliance & Governance |
| `module:soar` | `#7c3aed` | SOAR Automation |
| `module:siem` | `#7c3aed` | SIEM Integration |
| `module:ai` | `#7c3aed` | AI/ML Features |
| `module:auth` | `#7c3aed` | Authentication & Authorization |
| `module:frontend` | `#7c3aed` | UI/UX |
| `module:api` | `#7c3aed` | Backend API |
| `module:infra` | `#7c3aed` | Infrastructure & DevOps |

### Milestones

| Milestone | Target Date | Focus |
|-----------|-------------|-------|
| v1.1 — Hardening | Q2 2026 | Testing, performance, security |
| v1.2 — AI Intelligence | Q3 2026 | Copilot v2, threat intel, ML |
| v1.3 — Enterprise Scale | Q4 2026 | Multi-region, SSO, compliance |
| v2.0 — Growth | Q1 2027 | Self-serve, marketplace, analytics |

### Automation Rules

Configure these in **Project Settings → Workflows**:

1. **Auto-add to project**: When an issue or PR is opened, add it to the board
2. **Auto-move to In Progress**: When a PR is opened, move the linked issue to "In Progress"
3. **Auto-move to In Review**: When a PR is marked "Ready for Review", move to "In Review"
4. **Auto-move to Done**: When a PR is merged, move the linked issue to "Done"
5. **Auto-close stale**: Issues with no activity for 90 days get labeled `stale`

### Sprint Cadence

- **Sprint length**: 2 weeks
- **Sprint planning**: Monday (start of sprint)
- **Mid-sprint check-in**: Thursday
- **Sprint review/retro**: Friday (end of sprint)
- **Release cadence**: Monthly (end of every other sprint)
