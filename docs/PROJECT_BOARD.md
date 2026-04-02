# GitHub Project Board Structure

## Board: Zyra Development

Create a GitHub Projects board at the organization level with the following configuration.

### Columns (Status)

| Column | Purpose |
|--------|---------|
| Backlog | Accepted items not yet scheduled |
| Ready | Groomed, estimated, and ready for a sprint |
| In Progress | Actively being worked on |
| In Review | PR submitted, awaiting review |
| Done | Merged and verified |

### Custom Fields

| Field | Type | Options |
|-------|------|---------|
| Priority | Single select | P0 Critical, P1 High, P2 Medium, P3 Low |
| Sprint | Iteration | 2-week iterations |
| Estimate | Number | Story points (1, 2, 3, 5, 8, 13) |
| Track | Single select | Platform, AI/ML, Growth, Infrastructure |
| Module | Single select | See below |

### Module Options
- Authentication & Authorization
- Vulnerability Scanning
- AI Pentesting
- Cloud Security (CSPM)
- Container Security
- Exposure Management
- Threat Intelligence
- SOAR Automation
- Compliance & Governance
- SIEM Integration
- CAASM
- DevSecOps
- Frontend / UI
- Backend / API
- Database / Schema
- CI/CD & Infrastructure
- Documentation

### Views

**Board View** (default)
- Group by: Status
- Filter: current sprint

**Track Roadmap**
- Layout: Board
- Group by: Track
- Filter: Priority is P0 or P1

**Sprint Planning**
- Layout: Table
- Sort by: Priority, then Estimate
- Filter: Status is Backlog or Ready

**Module Breakdown**
- Layout: Table
- Group by: Module
- Sort by: Priority

### Automation Rules

| Trigger | Action |
|---------|--------|
| Issue opened | Add to Backlog |
| PR opened | Move to In Review |
| PR merged | Move to Done |
| Issue closed | Move to Done |
| Label `bug` added | Set Priority to P1 |
| Label `security` added | Set Priority to P0 |

### Track Descriptions

**Platform**
Core platform stability, performance, database, auth, multi-tenancy, and security hardening.

**AI/ML**
Security Copilot, AI pentesting, predictive prioritization, natural language queries, and ML model training.

**Growth**
Onboarding, billing, self-serve features, marketplace, documentation, and developer experience.

**Infrastructure**
CI/CD, deployment pipelines, monitoring, observability, and infrastructure-as-code.

### Labels

Apply these labels to the repository:

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or request |
| `security` | `#e11d48` | Security-related issue |
| `documentation` | `#0075ca` | Documentation improvements |
| `dependencies` | `#0366d6` | Dependency updates |
| `automated` | `#bfd4f2` | Automated PR (Dependabot, etc.) |
| `ci` | `#fbca04` | CI/CD pipeline changes |
| `triage` | `#d876e3` | Needs triage and prioritization |
| `good first issue` | `#7057ff` | Good for newcomers |
| `help wanted` | `#008672` | Extra attention needed |
| `wontfix` | `#ffffff` | Will not be worked on |
| `duplicate` | `#cfd3d7` | Duplicate issue |
| `breaking` | `#b60205` | Breaking change |
| `performance` | `#f9d0c4` | Performance improvement |
| `P0-critical` | `#b60205` | Critical priority |
| `P1-high` | `#d93f0b` | High priority |
| `P2-medium` | `#fbca04` | Medium priority |
| `P3-low` | `#0e8a16` | Low priority |
| `track/platform` | `#1d76db` | Platform track |
| `track/ai-ml` | `#7c3aed` | AI/ML track |
| `track/growth` | `#0e8a16` | Growth track |
| `track/infra` | `#e4e669` | Infrastructure track |
