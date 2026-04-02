# GitHub Project Board Setup

## Project: Zyra Platform

A GitHub Project board for tracking all platform work across four workstreams.

## Board Views

### 1. Board View (Default)

Columns:
| Column | Description |
|--------|-------------|
| Backlog | Unstarted items, triaged and prioritized |
| In Progress | Actively being worked on |
| In Review | PR open, awaiting review |
| Done | Merged and deployed |

### 2. Table View

Fields:
| Field | Type | Values |
|-------|------|--------|
| Status | Single Select | Backlog, In Progress, In Review, Done |
| Priority | Single Select | P0-Critical, P1-High, P2-Medium, P3-Low |
| Workstream | Single Select | Platform, AI, Growth, Infrastructure |
| Sprint | Iteration | 2-week iterations |
| Estimate | Number | Story points (1, 2, 3, 5, 8, 13) |
| Module | Single Select | (see below) |

### 3. Roadmap View

Timeline visualization grouped by workstream, filtered to P0 and P1 items.

## Workstreams

### Platform
Core product features and security modules.

Labels: `platform`, `frontend`, `backend`, `schema`

Example items:
- Attack path export to PDF/CSV
- CSRF token implementation
- API key scoping (read-only vs. read-write)
- Content Security Policy headers

### AI
AI Copilot, ML-based prioritization, intelligent automation.

Labels: `ai`, `ml`, `copilot`

Example items:
- Natural language query over security data
- Predictive vulnerability prioritization
- Automated incident summarization
- Context-aware remediation suggestions

### Growth
User acquisition, onboarding, billing, and self-serve.

Labels: `growth`, `onboarding`, `billing`

Example items:
- Usage-based billing metering
- Free tier with scan limits
- Onboarding wizard v2
- In-app upgrade flows

### Infrastructure
CI/CD, deployment, monitoring, scaling.

Labels: `infrastructure`, `ci`, `monitoring`, `deployment`

Example items:
- E2E test suite (Playwright)
- Database query optimization
- Rate limiting and throttling
- Multi-region read replicas

## Module Labels

Apply one module label per issue for filtering:

| Label | Color | Modules |
|-------|-------|---------|
| `mod:scanning` | `#0e8a16` | Vulnerability scanning, container scanning |
| `mod:exposure` | `#d93f0b` | Exposure management, attack paths |
| `mod:compliance` | `#006b75` | Compliance, audit, governance |
| `mod:soar` | `#5319e7` | SOAR, playbooks, automation |
| `mod:siem` | `#1d76db` | SIEM integration, data lake |
| `mod:intel` | `#fbca04` | Threat intel, CAASM, copilot |
| `mod:auth` | `#b60205` | Authentication, RBAC, SSO |
| `mod:ui` | `#c5def5` | Frontend, design system |
| `mod:api` | `#bfdadc` | API, backend routes |

## Setup Instructions

### Create Project
```bash
gh project create --owner @me --title "Zyra Platform" --format board
```

### Create Labels
```bash
# Priority labels
gh label create "P0-Critical" --color "b60205" --description "Critical priority"
gh label create "P1-High" --color "d93f0b" --description "High priority"
gh label create "P2-Medium" --color "fbca04" --description "Medium priority"
gh label create "P3-Low" --color "0e8a16" --description "Low priority"

# Workstream labels
gh label create "platform" --color "5319e7" --description "Core platform work"
gh label create "ai" --color "1d76db" --description "AI and ML features"
gh label create "growth" --color "006b75" --description "Growth and self-serve"
gh label create "infrastructure" --color "c5def5" --description "CI/CD and infra"

# Module labels
gh label create "mod:scanning" --color "0e8a16"
gh label create "mod:exposure" --color "d93f0b"
gh label create "mod:compliance" --color "006b75"
gh label create "mod:soar" --color "5319e7"
gh label create "mod:siem" --color "1d76db"
gh label create "mod:intel" --color "fbca04"
gh label create "mod:auth" --color "b60205"
gh label create "mod:ui" --color "c5def5"
gh label create "mod:api" --color "bfdadc"

# Type labels
gh label create "bug" --color "d73a4a"
gh label create "enhancement" --color "a2eeef"
gh label create "documentation" --color "0075ca"
gh label create "dependencies" --color "0366d6"
gh label create "automated" --color "ededed"
gh label create "security" --color "b60205"
gh label create "ci" --color "e4e669"
gh label create "triage" --color "d4c5f9"
```

## Automation Rules

Configure these in Project Settings → Workflows:

1. **Auto-add issues** — New issues with `bug` or `enhancement` label are added to the project
2. **Auto-set status** — PRs linked to issues move the issue to "In Review" when opened
3. **Auto-close** — Merged PRs move linked issues to "Done"
4. **Auto-archive** — Items in "Done" for 14+ days are archived
