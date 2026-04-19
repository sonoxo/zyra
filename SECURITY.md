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

## 🔴 Vercel Security Incident (April 2026)

On April 19, 2026, Vercel disclosed a security incident involving unauthorized access to internal systems. While Zyra's deployment may be affected, follow these steps immediately:

### Impact Assessment

- **Affected:** Projects deployed on Vercel
- **Risk:** Potential exposure of environment variables not marked as "sensitive"
- **Attack Vector:** Compromised third-party AI tool with Google Workspace OAuth app

### Required Actions

1. **Review Activity Logs**
   - Check Vercel Dashboard → Activity Log for suspicious deployments
   - Look for unknown IP addresses or unauthorized changes

2. **Rotate All Secrets**
   Immediately rotate these credentials if deployed on Vercel:
   - `JWT_SECRET` — Generate new 32+ character random string
   - `ANTHROPIC_API_KEY` — Regenerate via Anthropic console
   - `STRIPE_SECRET_KEY` — Regenerate in Stripe dashboard
   - `WEBHOOK_SECRET` — Generate new HMAC key
   - `TURNSTILE_SECRET_KEY` — Regenerate in Cloudflare

3. **Mark Environment Variables as Sensitive**
   In Vercel Dashboard → Environment Variables:
   - Check "Sensitive" checkbox for all secrets
   - This prevents values from being read in build logs

4. **Review GitHub Integrations**
   - Check if any GitHub tokens or OAuth apps were compromised
   - The IOC OAuth app ID: `110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com`

5. **Enable Additional Security**
   - Enable IP allowlisting for admin routes
   - Review and restrict CORS origins
   - Enable Sentry error monitoring

### Quick Rotation Script

```bash
# Generate new secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For WEBHOOK_SECRET

# Update in Vercel dashboard or CLI
vercel env add JWT_SECRET production
vercel env add ANTHROPIC_API_KEY production
# ... repeat for all secrets
```

### Monitor

- Follow https://vercel.com/kb/bulletin/vercel-april-2026-security-incident for updates
- Monitor your GitHub repos for unauthorized access
- Check AWS/GCP cloud logs for unusual activity

---

*Last updated: April 19, 2026*