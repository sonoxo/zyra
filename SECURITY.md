# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Zyra takes security seriously. If you believe you have found a security vulnerability, please report it responsibly.

### How to Report

**Email**: security@zyra.dev

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested remediation (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours of report submission
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Critical issues targeted within 14 days; high-severity within 30 days
- **Disclosure**: Coordinated disclosure after a fix is available

### Scope

The following are in scope:
- Authentication and authorization bypasses
- SQL injection and other injection attacks
- Cross-site scripting (XSS) and cross-site request forgery (CSRF)
- Insecure direct object references (IDOR)
- Cross-tenant data leakage
- Session management vulnerabilities
- API key exposure or mishandling
- Server-side request forgery (SSRF)

### Out of Scope

- Denial of service attacks
- Social engineering
- Physical security
- Issues in third-party dependencies (report upstream; notify us if critical)
- Self-XSS or issues requiring unlikely user interaction

### Safe Harbor

We will not pursue legal action against researchers who:
- Act in good faith to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts you own or have explicit permission to test
- Report vulnerabilities promptly and do not exploit them beyond what is necessary to demonstrate the issue
- Do not publicly disclose vulnerabilities before a fix is available

## Security Architecture

### Authentication
- Passwords hashed with bcryptjs (cost factor 10)
- Server-side sessions backed by PostgreSQL
- API keys stored as SHA-256 hashes with prefix-based lookup

### Authorization
- Organization-scoped data isolation (multi-tenant)
- Role-based access control: Owner > Admin > Analyst > Viewer
- Middleware guards on all mutating endpoints

### Data Protection
- All data queries scoped by organization ID
- No cross-tenant data access through the storage layer
- Audit logging for administrative actions
- Configurable data retention with automated purge

### Infrastructure
- TLS enforced at the platform edge
- Environment variables for all secrets (never hardcoded)
- Session secrets rotated independently of application deployments

## Dependencies

- Automated dependency scanning via Dependabot
- CodeQL static analysis on every pull request
- SAST scanning integrated into CI pipeline
