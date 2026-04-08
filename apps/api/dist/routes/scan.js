import { authMiddleware } from '../middleware/auth.js';
import { scansStore } from '../lib/fileStore.js';
// Real vulnerability scanning logic
async function performSecurityScan(targetUrl) {
    const findings = [];
    let vulnerabilities = { critical: 0, high: 0, medium: 0, low: 0 };
    try {
        const urlObj = new URL(targetUrl);
        try {
            const response = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            const securityHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'];
            const missingHeaders = [];
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
        }
        catch { }
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
                    if (vuln.severity === 'critical')
                        vulnerabilities.critical++;
                    else if (vuln.severity === 'high')
                        vulnerabilities.high++;
                    else
                        vulnerabilities.medium++;
                }
            }
            catch { }
        }
    }
    catch (error) {
        findings.push({ severity: 'medium', title: 'Scan Error', description: error.message });
        vulnerabilities.medium++;
    }
    const baseScore = 100;
    const deductions = (vulnerabilities.critical * 25) + (vulnerabilities.high * 15) + (vulnerabilities.medium * 5) + (vulnerabilities.low * 2);
    const score = Math.max(0, baseScore - deductions);
    let riskLevel = 'LOW';
    if (vulnerabilities.critical > 0 || vulnerabilities.high >= 3)
        riskLevel = 'CRITICAL';
    else if (vulnerabilities.high > 0 || vulnerabilities.medium >= 3)
        riskLevel = 'HIGH';
    else if (vulnerabilities.medium > 0)
        riskLevel = 'MEDIUM';
    return { score, riskLevel, vulnerabilities, findings };
}
export default async function scanRoutes(fastify) {
    await fastify.addHook('onRequest', authMiddleware);
    // GET /api/scan - list scans
    fastify.get('/', async (req, reply) => {
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        const scans = scansStore.findMany(s => s.orgId === orgId);
        return reply.send({ success: true, data: scans });
    });
    // POST /api/scan - create scan
    fastify.post('/', async (req, reply) => {
        const { targetUrl, type = 'QUICK' } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        if (!targetUrl) {
            return reply.status(400).send({ success: false, error: 'targetUrl required' });
        }
        const scan = scansStore.create({
            type,
            status: 'RUNNING',
            targetUrl,
            score: null,
            riskLevel: null,
            summary: null,
            orgId,
            assetId: null,
            createdAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            completedAt: null,
            updatedAt: new Date().toISOString(),
        });
        // Run scan async
        performSecurityScan(targetUrl).then(result => {
            scansStore.update({ id: scan.id }, {
                status: 'COMPLETED',
                score: result.score,
                riskLevel: result.riskLevel,
                summary: JSON.stringify({ vulnerabilities: result.vulnerabilities, riskLevel: result.riskLevel }),
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        });
        return reply.status(201).send({ success: true, data: scan });
    });
    // GET /api/scan/:id
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        const scan = scansStore.findUnique({ id });
        if (!scan) {
            return reply.status(404).send({ success: false, error: 'Scan not found' });
        }
        return reply.send({ success: true, data: scan });
    });
}
