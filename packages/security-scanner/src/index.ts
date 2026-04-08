/**
 * @zyra/security-scanner
 * Lightweight vulnerability scanner for web applications
 */

export interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  cve?: string
}

export interface ScanResult {
  score: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
  }
  findings: Vulnerability[]
  scannedAt: string
}

export interface ScanOptions {
  timeout?: number
  checkPaths?: string[]
}

/**
 * Perform a security scan on a target URL
 */
export async function scan(url: string, options: ScanOptions = {}): Promise<ScanResult> {
  const findings: Vulnerability[] = []
  let vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0 }
  const timeout = options.timeout || 5000
  const defaultPaths = [
    { path: '/.git/config', severity: 'high' as const, title: 'Exposed Git Config', cve: 'CWE-552' },
    { path: '/.env', severity: 'critical' as const, title: 'Environment File Exposure', cve: 'CWE-200' },
    { path: '/wp-config.php', severity: 'critical' as const, title: 'WordPress Config Exposure', cve: 'CWE-200' },
    { path: '/phpinfo.php', severity: 'high' as const, title: 'PHP Info Exposure', cve: 'CWE-215' },
    { path: '/admin', severity: 'medium' as const, title: 'Admin Panel Found', cve: 'CWE-489' },
    { path: '/.DS_Store', severity: 'low' as const, title: 'macOS DS_Store Exposed', cve: 'CWE-552' },
    { path: '/.aws/credentials', severity: 'critical' as const, title: 'AWS Credentials Exposure', cve: 'CWE-200' },
    { path: '/backup.zip', severity: 'high' as const, title: 'Backup File Exposed', cve: 'CWE-552' },
  ]
  const checkPaths = options.checkPaths || defaultPaths

  try {
    const urlObj = new URL(url)

    // Check 1: SSL/TLS and security headers
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeout) })
      const securityHeaders = [
        'strict-transport-security',
        'content-security-policy', 
        'x-frame-options',
        'x-content-type-options'
      ]
      const missingHeaders: string[] = []

      for (const header of securityHeaders) {
        if (!response.headers.get(header)) {
          missingHeaders.push(header)
        }
      }

      if (missingHeaders.length > 0) {
        findings.push({
          severity: 'medium',
          title: 'Missing Security Headers',
          description: `Missing: ${missingHeaders.join(', ')}`
        })
        vulnerabilities.medium += missingHeaders.length
      }

      if (urlObj.protocol === 'http:') {
        findings.push({
          severity: 'critical',
          title: 'No HTTPS Encryption',
          description: 'Site does not use HTTPS. All data transmitted in plaintext.',
          cve: 'CWE-319'
        })
        vulnerabilities.critical++
      }
    } catch (e: any) {
      findings.push({
        severity: 'medium',
        title: 'Connection Failed',
        description: `Could not connect to target: ${e.message}`
      })
      vulnerabilities.medium++
    }

    // Check 2: Common vulnerable paths
    for (const vuln of checkPaths) {
      try {
        const targetUrl = url.replace(/\/$/, '') + vuln.path
        const res = await fetch(targetUrl, { 
          method: 'GET', 
          signal: AbortSignal.timeout(3000) 
        })
        
        if (res.status === 200) {
          findings.push({
            severity: vuln.severity,
            title: vuln.title,
            description: `Found exposed file at ${vuln.path}`,
            cve: vuln.cve
          })
          
          if (vuln.severity === 'critical') vulnerabilities.critical++
          else if (vuln.severity === 'high') vulnerabilities.high++
          else if (vuln.severity === 'medium') vulnerabilities.medium++
          else vulnerabilities.low++
        }
      } catch {
        // Path not found - that's good
      }
    }

  } catch (error: any) {
    findings.push({
      severity: 'medium',
      title: 'Scan Error',
      description: error.message
    })
    vulnerabilities.medium++
  }

  // Calculate score
  const baseScore = 100
  const deductions = (vulnerabilities.critical * 25) + 
                     (vulnerabilities.high * 15) + 
                     (vulnerabilities.medium * 5) + 
                     (vulnerabilities.low * 2)
  const score = Math.max(0, baseScore - deductions)

  // Determine risk level
  let riskLevel: ScanResult['riskLevel'] = 'LOW'
  if (vulnerabilities.critical > 0 || vulnerabilities.high >= 3) riskLevel = 'CRITICAL'
  else if (vulnerabilities.high > 0 || vulnerabilities.medium >= 3) riskLevel = 'HIGH'
  else if (vulnerabilities.medium > 0) riskLevel = 'MEDIUM'

  return {
    score,
    riskLevel,
    vulnerabilities,
    findings,
    scannedAt: new Date().toISOString()
  }
}

export default { scan }
