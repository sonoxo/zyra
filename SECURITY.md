# Security Policy

## Supported Versions

| Version | Supported | Notes |
|---------|------------|-------|
| 1.0.x | ✅ | Current stable release |

## Reporting a Vulnerability

If you discover a security vulnerability in Zyra, please send an email to **security@zyra.host**.

We appreciate your help keeping Zyra secure. We'll aim to acknowledge your report within 24 hours and provide a timeline for a fix.

## Security Features

Zyra includes the following security measures:

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting on auth endpoints
- CAPTCHA (Turnstile) on login/register

### API Security
- Input validation with Zod
- Parameterized queries via Prisma (prevents SQL injection)
- HMAC-signed webhooks
- CORS with strict origin allowlist

### Network Security
- SSRF protection (blocks internal network access)
- IP allowlisting for admin endpoints
- Security headers (CSP, HSTS, etc.)

### Monitoring
- Full audit logging
- Request ID tracking
- Rate limiting per endpoint
- Error tracking with Sentry

### Dependency Security
- Regular npm audit
- Dependency updates
- GitHub security alerts enabled

## Known Security Considerations

### Production Deployment

When deploying to production:

1. **Set strong secrets:**
   - `JWT_SECRET` — Use a 32+ character random string
   - `ANTHROPIC_API_KEY` — Your Claude API key
   - `WEBHOOK_SECRET` — For HMAC signing

2. **Enable security features:**
   - `ENABLE_IP_ALLOWLIST=true` for admin endpoints
   - `TURNSTILE_SECRET_KEY` for CAPTCHA

3. **Use HTTPS in production**

4. **Regular updates:**
   ```bash
   npm audit fix
   npm update
   ```

## Compliance

Zyra is designed to help with compliance for:

- SOC 2 Type II
- HIPAA
- GDPR
- PCI DSS (Ready for Level 1)
- ISO 27001 (Roadmap)

---

*Last updated: April 2026*