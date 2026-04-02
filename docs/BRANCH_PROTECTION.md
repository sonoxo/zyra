# Branch Protection & Environment Configuration

## Branch Strategy

```
main        ← Production-ready code. Protected. Deploys to production.
develop     ← Integration branch. Protected. Deploys to staging.
feat/*      ← Feature branches. Merge into develop via PR.
fix/*       ← Bug fix branches. Merge into develop or main (hotfix) via PR.
release/*   ← Release candidates. Branch from develop, merge into main + develop.
```

## Recommended Branch Protection Rules

### `main` Branch

| Setting | Value |
|---------|-------|
| Require pull request reviews | Yes (minimum 1 reviewer) |
| Dismiss stale reviews on new commits | Yes |
| Require review from code owners | Yes |
| Require status checks to pass | Yes |
| Required checks | `CI / Lint & Type Check`, `CI / Build`, `CodeQL Analysis / Analyze` |
| Require branches to be up to date | Yes |
| Require signed commits | Recommended |
| Require linear history | Yes |
| Include administrators | Yes |
| Allow force pushes | No |
| Allow deletions | No |

### `develop` Branch

| Setting | Value |
|---------|-------|
| Require pull request reviews | Yes (minimum 1 reviewer) |
| Require status checks to pass | Yes |
| Required checks | `CI / Lint & Type Check`, `CI / Build` |
| Allow force pushes | No |
| Allow deletions | No |

## GitHub Environments

### `development`
- **Deployment branch**: `develop`
- **No required reviewers**
- **Variables**:
  - `ENVIRONMENT_URL` — Dev instance URL
- **Secrets**:
  - `DATABASE_URL` — Development database connection string

### `staging`
- **Deployment branch**: `develop`
- **Required reviewers**: 1 (engineering lead)
- **Wait timer**: None
- **Variables**:
  - `STAGING_URL` — Staging instance URL
- **Secrets**:
  - `STAGING_DATABASE_URL` — Staging database connection string

### `production`
- **Deployment branches**: `main`, release tags (`v*.*.*`)
- **Required reviewers**: 2 (engineering lead + security)
- **Wait timer**: 15 minutes (allows rollback decision)
- **Variables**:
  - `PRODUCTION_URL` — Production instance URL
- **Secrets**:
  - `PRODUCTION_DATABASE_URL` — Production database connection string
  - `SESSION_SECRET` — Production session signing key

## Setup Instructions

### Via GitHub UI
1. Go to **Settings → Branches → Add rule**
2. Enter the branch name pattern (e.g., `main`)
3. Configure the settings listed above
4. Click **Create**

### Via GitHub CLI
```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["CI / Lint & Type Check","CI / Build","CodeQL Analysis / Analyze"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Environment Setup
```bash
# Create environments via GitHub CLI
gh api repos/{owner}/{repo}/environments/development --method PUT
gh api repos/{owner}/{repo}/environments/staging --method PUT \
  --field reviewers='[{"type":"User","id":USER_ID}]'
gh api repos/{owner}/{repo}/environments/production --method PUT \
  --field reviewers='[{"type":"User","id":USER_ID_1},{"type":"User","id":USER_ID_2}]' \
  --field wait_timer=15
```
