# @zyra/security-scanner

Lightweight vulnerability scanner for web applications.

## Installation

```bash
npm install @zyra/security-scanner
```

## Usage

```typescript
import { scan } from '@zyra/security-scanner'

const result = await scan('https://example.com')

console.log(`Security Score: ${result.score}/100`)
console.log(`Risk Level: ${result.riskLevel}`)
console.log(`Vulnerabilities:`, result.vulnerabilities)

// Output:
// Security Score: 85/100  
// Risk Level: MEDIUM
// Vulnerabilities: { critical: 0, high: 0, medium: 3, low: 0 }
```

## Features

- ✅ SSL/TLS configuration check
- ✅ Security headers analysis (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Common vulnerable path scanning (.git, .env, wp-config.php, etc.)
- ✅ CVE references for findings
- ✅ Configurable timeout and custom check paths

## API

### `scan(url: string, options?: ScanOptions): Promise<ScanResult>`

Performs a security scan on the target URL.

**Parameters:**
- `url` - Target URL to scan
- `options.timeout` - Request timeout in ms (default: 5000)
- `options.checkPaths` - Custom list of paths to check

**Returns:** `ScanResult` with score, risk level, vulnerabilities, and findings.

## License

MIT
