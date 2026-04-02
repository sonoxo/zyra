# Contributing to Zyra

Thank you for considering contributing to Zyra. This guide covers the process for contributing to the project.

## Code of Conduct

By participating, you agree to uphold a respectful and inclusive environment. We expect all contributors to act professionally and constructively.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Set up your environment (see README.md)
5. Create a feature branch from `main`

## Branch Naming

Use the following prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/attack-path-export` |
| `fix/` | Bug fixes | `fix/scan-timeout` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code refactoring | `refactor/storage-layer` |
| `test/` | Test additions | `test/exposure-monitor` |
| `chore/` | Maintenance tasks | `chore/update-deps` |

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Scopes**: `frontend`, `backend`, `schema`, `auth`, `exposure`, `soar`, `siem`, `compliance`, `ci`

Examples:
```
feat(exposure): add automated remediation for firewall rules
fix(backend): prevent duplicate exposure alerts on rescan
docs(api): add OpenAPI annotations to scan endpoints
```

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Run the development server and verify your changes work
3. Fill out the PR template completely
4. Request review from at least one maintainer
5. Address review feedback promptly

### PR Requirements

- [ ] Code compiles without errors
- [ ] No regressions in existing functionality
- [ ] New API endpoints include input validation
- [ ] Database schema changes use Drizzle ORM
- [ ] Frontend components include `data-testid` attributes
- [ ] Sensitive data is never logged or exposed

## Development Guidelines

### Backend

- Use the `IStorage` interface for all database operations
- Keep route handlers thin — business logic belongs in modules
- Validate request bodies with Zod schemas from `drizzle-zod`
- Scope all queries by `orgId` for multi-tenancy
- Use appropriate middleware guards (`requireAuth`, `requireAdmin`, `requireAnalyst`)

### Frontend

- Use TanStack Query for all server state
- Use `apiRequest` from `@/lib/queryClient` for mutations
- Invalidate query cache after mutations
- Use shadcn/ui components from `@/components/ui/`
- Icons: `lucide-react` for actions, `react-icons/si` for brand logos

### Schema Changes

- Define tables in `shared/schema.ts`
- Create insert schemas with `createInsertSchema` from `drizzle-zod`
- Export both insert and select types
- Update `IStorage` interface and `DatabaseStorage` implementation
- Update `replit.md` with new table counts

## Reporting Issues

Use GitHub Issues with the appropriate template:
- **Bug Report** — Something is broken
- **Feature Request** — Suggest an improvement
- **Security Issue** — Do NOT open a public issue; email security@zyra.dev

## Questions?

Open a Discussion in the repository or reach out to the maintainer team.
