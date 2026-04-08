import type { FastifyInstance } from 'fastify'
import { storeScan, getScan, generateScanId } from '../lib/scanStore.js'

interface ScanResult {
  id: string
  targetUrl: string
  type: string
  status: string
  score: number
  riskLevel: string
  summary: string
  findings: Array<{ severity: string; title: string; description: string; cve?: string }>
  completedAt: string
}

// Real vulnerability scanning logic
async function performSecurityScan(targetUrl: string): Promise<{
  score: number;
  riskLevel: string;
  vulnerabilities: { critical: number; high: number; medium: number; low: number };
  findings: Array<{ severity: string; title: string; description: string; cve?: string }>;
}> {
  const findings: Array<{ severity: string; title: string; description: string; cve?: string }> = [];
  let vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0 };

  try {
    const urlObj = new URL(targetUrl);

    // Check 1: SSL/TLS and security headers
    try {
      const response = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const securityHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'];
      const missingHeaders: string[] = [];
      
      for (const header of securityHeaders) {
        if (!response.headers.get(header)) {
          missingHeaders.push(header);
        }
      }

      if (missingHeaders.length > 0) {
        findings.push({ severity: 'medium', title: 'Missing Security Headers', description: `Missing: ${missingHeaders.join(', ')}` });
        vulnerabilities.medium += missingHeaders.length;
      }

      if (urlObj.protocol === 'http:') {
        findings.push({ severity: 'critical', title: 'No HTTPS', description: 'Site not using HTTPS', cve: 'CWE-319' });
        vulnerabilities.critical++;
      }
    } catch {}

    // Check 2: Common vulnerable paths
    const vulnerablePaths = [
      { path: '/.git/config', severity: 'high', title: 'Exposed Git Config' },
      { path: '/.env', severity: 'critical', title: 'Environment File Exposure' },
      { path: '/wp-config.php', severity: 'critical', title: 'WordPress Config' },
      { path: '/phpinfo.php', severity: 'high', title: 'PHP Info' },
    ];

    for (const vuln of vulnerablePaths) {
      try {
        const res = await fetch(targetUrl.replace(/\/$/, '') + vuln.path, { signal: AbortSignal.timeout(3000) });
        if (res.status === 200) {
          findings.push({ severity: vuln.severity, title: vuln.title, description: `Found at ${vuln.path}` });
          if (vuln.severity === 'critical') vulnerabilities.critical++;
          else if (vuln.severity === 'high') vulnerabilities.high++;
          else vulnerabilities.medium++;
        }
      } catch {}
    }
  } catch (error: any) {
    findings.push({ severity: 'medium', title: 'Scan Error', description: error.message });
    vulnerabilities.medium++;
  }

  const baseScore = 100;
  const deductions = (vulnerabilities.critical * 25) + (vulnerabilities.high * 15) + (vulnerabilities.medium * 5) + (vulnerabilities.low * 2);
  const score = Math.max(0, baseScore - deductions);
  
  let riskLevel = 'LOW';
  if (vulnerabilities.critical > 0 || vulnerabilities.high >= 3) riskLevel = 'CRITICAL';
  else if (vulnerabilities.high > 0 || vulnerabilities.medium >= 3) riskLevel = 'HIGH';
  else if (vulnerabilities.medium > 0) riskLevel = 'MEDIUM';

  return { score, riskLevel, vulnerabilities, findings };
}

// Public scan routes for free tier / marketing
export default async function publicRoutes(fastify: FastifyInstance) {
  // POST /api/public/scan - free scan without auth
  fastify.post('/scan', async (req, reply) => {
    const { url, type = 'QUICK' } = req.body as { url?: string; type?: string }
    
    if (!url) {
      return reply.status(400).send({ success: false, error: 'url required' })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return reply.status(400).send({ success: false, error: 'Invalid URL format' })
    }

    try {
      // Run scan directly
      const scanId = generateScanId()
      const result = await performSecurityScan(url)

      // Store scan result in memory
      const scanResult: ScanResult = {
        id: scanId,
        targetUrl: url,
        type,
        status: 'COMPLETED',
        score: result.score,
        riskLevel: result.riskLevel,
        summary: JSON.stringify({
          vulnerabilities: result.vulnerabilities,
          riskLevel: result.riskLevel,
          asset: url,
          scannedAt: new Date().toISOString()
        }),
        findings: result.findings,
        completedAt: new Date().toISOString()
      }
      storeScan(scanResult)

      return reply.send({
        success: true,
        data: {
          id: scanId,
          targetUrl: url,
          type,
          status: 'COMPLETED',
          score: result.score,
          riskLevel: result.riskLevel,
          summary: scanResult.summary,
          findings: result.findings,
          completedAt: scanResult.completedAt
        }
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/public/report/:token - get public scan report
  fastify.get('/report/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    
    // Try to get from in-memory store
    const scan = getScan(token)
    if (!scan) {
      return reply.status(404).send({ 
        success: false, 
        error: 'Scan not found. It may have expired.' 
      })
    }

    return reply.send({
      success: true,
      data: {
        id: scan.id,
        targetUrl: scan.targetUrl,
        score: scan.score,
        riskLevel: scan.riskLevel,
        summary: scan.summary,
        findings: scan.findings,
        completedAt: scan.completedAt
      }
    })
  })
}
