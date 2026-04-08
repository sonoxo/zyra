# @zyra/fastify-security

Fastify security middleware - headers, rate limiting, input sanitization.

## Installation

```bash
npm install @zyra/fastify-security
```

## Usage

```typescript
import Fastify from 'fastify'
import { fastifySecurity } from '@zyra/fastify-security'

const app = Fastify()

await app.register(fastifySecurity, {
  corsOrigins: ['https://yourdomain.com'],
  rateLimitMax: 100,
  rateLimitWindow: 60000,
  enableCSP: true
})
```

## Features

- ✅ Security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Rate limiting (configurable per IP)
- ✅ Input sanitization (null bytes, trimming)
- ✅ Referrer Policy & Permissions Policy
- ✅ Removes X-Powered-By header

## API

### `fastifySecurity(fastify, options)`

**Options:**
- `corsOrigins` - Array of allowed origins
- `rateLimitWindow` - Time window in ms (default: 60000)
- `rateLimitMax` - Max requests per window (default: 100)
- `enableCSP` - Enable Content Security Policy (default: true)

## License

MIT
