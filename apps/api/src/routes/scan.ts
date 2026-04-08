import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { logActivity } from './activities.js'
import { triggerWebhook } from '../lib/webhook.js'
import { sendToOrg } from '../websocket/index.js'

const SCAN_SCORES = {
  FULL: { min: 60, max: 100 },
  QUICK: { min: 70, max: 100 },
  SPECIFIC: { min: 50, max: 100 },
}

export default async function scanRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', authMiddleware)

  // GET /api/scan - list scans
  fastify.get('/', async (req, reply) => {
    const orgId = (req.query as any)?.orgId || req.user?.orgId
    
    try {
      const scans = await prisma.scan.findMany({
        where: orgId ? { orgId } : {},
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send({ success: true, data: scans })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/scan - create/schedule scan
  fastify.post('/', async (req, reply) => {
    const { type, assetId, target } = req.body as any
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    try {
      const scan = await prisma.scan.create({
        data: {
          type: type || 'QUICK',
          status: 'PENDING',
          orgId,
          assetId: assetId || null,
        },
      })

      await logActivity(prisma, {
        action: 'SCAN_CREATED',
        entityType: 'SCAN',
        entityId: scan.id,
        description: `Created ${type || 'QUICK'} scan`,
        orgId,
        userId: req.user!.id,
      })

      // Trigger webhooks
      await triggerWebhook(orgId, 'scan.created', { id: scan.id, type: scan.type })
      sendToOrg(orgId, 'scan.created', { id: scan.id, type: scan.type })

      return reply.status(201).send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/scan/:id - get scan details
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const scan = await prisma.scan.findUnique({
        where: { id },
        include: { asset: true },
      })

      if (!scan) {
        return reply.status(404).send({ success: false, error: 'Scan not found' })
      }

      return reply.send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // Real vulnerability scanning logic
  async function performSecurityScan(url: string): Promise<{
    score: number;
    riskLevel: string;
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    findings: Array<{ severity: string; title: string; description: string; cve?: string }>;
  }> {
    const findings: Array<{ severity: string; title: string; description: string; cve?: string }> = [];
    let vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0 };

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Check 1: SSL/TLS configuration
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        const server = response.headers.get('server') || '';
        
        // Check for missing security headers
        const securityHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'];
        const missingHeaders: string[] = [];
        
        for (const header of securityHeaders) {
          if (!response.headers.get(header)) {
            missingHeaders.push(header);
          }
        }

        if (missingHeaders.length > 0) {
          findings.push({
            severity: 'medium',
            title: 'Missing Security Headers',
            description: `Missing headers: ${missingHeaders.join(', ')}. This can make the site vulnerable to clickjacking, MIME-sniffing, and other attacks.`,
          });
          vulnerabilities.medium += missingHeaders.length;
        }

        // Check for outdated server software
        const outdatedServers = ['Apache/2.4', 'Nginx/1.2', 'Microsoft-IIS/7'];
        if (outdatedServers.some(s => server.includes(s))) {
          findings.push({
            severity: 'high',
            title: 'Outdated Server Software',
            description: `Server '${server}' is outdated and may have known vulnerabilities.`,
          });
          vulnerabilities.high++;
        }

        // Check for no SSL (HTTP instead of HTTPS)
        if (urlObj.protocol === 'http:') {
          findings.push({
            severity: 'critical',
            title: 'No HTTPS Encryption',
            description: 'The site is not using HTTPS. All data is transmitted in plaintext, vulnerable to interception.',
            cve: 'CWE-319'
          });
          vulnerabilities.critical++;
        }
      } catch (e: any) {
        findings.push({
          severity: 'medium',
          title: 'Connection Failed',
          description: `Could not connect to target: ${e.message}`,
        });
        vulnerabilities.medium++;
      }

      // Check 2: Check for common vulnerable paths
      const vulnerablePaths = [
        { path: '/.git/config', severity: 'high', title: 'Exposed Git Config', cve: 'CWE-552' },
        { path: '/wp-config.php', severity: 'critical', title: 'WordPress Config Exposure', cve: 'CWE-200' },
        { path: '/.env', severity: 'critical', title: 'Environment File Exposure', cve: 'CWE-200' },
        { path: '/phpinfo.php', severity: 'high', title: 'PHP Info Exposure', cve: 'CWE-215' },
        { path: '/admin', severity: 'medium', title: 'Admin Panel Found', cve: 'CWE-489' },
        { path: '/.DS_Store', severity: 'low', title: 'macOS DS_Store Exposed', cve: 'CWE-552' },
      ];

      for (const vuln of vulnerablePaths) {
        try {
          const checkUrl = url.replace(/\/$/, '') + vuln.path;
          const res = await fetch(checkUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
          if (res.status === 200) {
            findings.push({
              severity: vuln.severity,
              title: vuln.title,
              description: `Found exposed file at ${vuln.path}`,
              cve: vuln.cve
            });
            if (vuln.severity === 'critical') vulnerabilities.critical++;
            else if (vuln.severity === 'high') vulnerabilities.high++;
            else if (vuln.severity === 'medium') vulnerabilities.medium++;
            else vulnerabilities.low++;
          }
        } catch {}
      }

      // Check 3: DNS/Whois info (basic check)
      try {
        const dnsCheck = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`, { signal: AbortSignal.timeout(5000) });
        const dnsData = await dnsCheck.json();
        if (dnsData.Answer) {
          const ip = dnsData.Answer[0]?.data;
          // Basic check for cloudflare or known CDN protection
          findings.push({
            severity: 'low',
            title: 'DNS Information',
            description: `Resolved IP: ${ip}. Ensure proper firewall rules are in place.`,
          });
        }
      } catch {}

    } catch (error: any) {
      findings.push({
        severity: 'medium',
        title: 'Scan Error',
        description: `Error during scan: ${error.message}`,
      });
      vulnerabilities.medium++;
    }

    // Calculate security score
    const baseScore = 100;
    const deductions = (vulnerabilities.critical * 25) + (vulnerabilities.high * 15) + 
                       (vulnerabilities.medium * 5) + (vulnerabilities.low * 2);
    const score = Math.max(0, baseScore - deductions);

    // Determine risk level
    let riskLevel = 'LOW';
    if (vulnerabilities.critical > 0 || vulnerabilities.high >= 3) riskLevel = 'CRITICAL';
    else if (vulnerabilities.high > 0 || vulnerabilities.medium >= 3) riskLevel = 'HIGH';
    else if (vulnerabilities.medium > 0 || vulnerabilities.low >= 3) riskLevel = 'MEDIUM';

    return { score, riskLevel, vulnerabilities, findings };
  }

  // POST /api/scan/:id/run - run real security scan
  fastify.post('/:id/run', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user?.orgId

    try {
      const scan = await prisma.scan.findUnique({ where: { id } })
      if (!scan) {
        return reply.status(404).send({ success: false, error: 'Scan not found' })
      }

      await prisma.scan.update({
        where: { id },
        data: { status: 'RUNNING', startedAt: new Date() },
      })

      // Run the actual security scan
      const result = await performSecurityScan(scan.targetUrl)

      // Update scan with real results
      await prisma.scan.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          score: result.score,
          riskLevel: result.riskLevel,
          summary: JSON.stringify({
            vulnerabilities: result.vulnerabilities,
            riskLevel: result.riskLevel,
            asset: scan.targetUrl,
            scannedAt: new Date().toISOString()
          }),
          completedAt: new Date(),
        },
      })

      await logActivity(prisma, {
        action: 'SCAN_STARTED',
        entityType: 'SCAN',
        entityId: id,
        description: `Started scan`,
        orgId: orgId!,
        userId: req.user!.id,
      })

      return reply.send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/scan/:id - cancel/delete scan
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.scan.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}