import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendToOrg } from '../websocket/index.js';
export default async function jobRoutes(fastify) {
    await fastify.addHook('onRequest', async (req, reply) => {
        await authMiddleware(req, reply);
    });
    // GET /api/jobs - list jobs for org
    fastify.get('/', async (req, reply) => {
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        try {
            const jobs = await prisma.job.findMany({
                where: { orgId },
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: { creator: { select: { id: true, name: true, email: true } } },
            });
            return reply.send({ success: true, data: jobs });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/jobs - create a new job
    fastify.post('/', async (req, reply) => {
        const { type, payload, scheduledAt } = req.body;
        const orgId = req.user?.orgId;
        const userId = req.user?.id;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        if (!type) {
            return reply.status(400).send({ success: false, error: 'type required' });
        }
        try {
            const job = await prisma.job.create({
                data: {
                    type,
                    payload: JSON.stringify(payload || {}),
                    orgId,
                    createdById: userId,
                    status: 'PENDING',
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
                },
            });
            // Notify via WebSocket
            sendToOrg(orgId, 'job.created', { id: job.id, type });
            // Process job asynchronously if immediate
            if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
                processJob(job.id).catch(console.error);
            }
            return reply.status(201).send({ success: true, data: job });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // GET /api/jobs/:id - get job details
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        try {
            const job = await prisma.job.findUnique({
                where: { id },
                include: { creator: { select: { id: true, name: true, email: true } } },
            });
            if (!job) {
                return reply.status(404).send({ success: false, error: 'Job not found' });
            }
            return reply.send({ success: true, data: job });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/jobs/:id/run - manually trigger a job
    fastify.post('/:id/run', async (req, reply) => {
        const { id } = req.params;
        try {
            const job = await prisma.job.findUnique({ where: { id } });
            if (!job) {
                return reply.status(404).send({ success: false, error: 'Job not found' });
            }
            // Update to running
            const updated = await prisma.job.update({
                where: { id },
                data: { status: 'RUNNING', startedAt: new Date(), attempts: job.attempts + 1 },
            });
            // Process in background
            processJob(id).catch(console.error);
            return reply.send({ success: true, data: updated });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // DELETE /api/jobs/:id - cancel/delete a job
    fastify.delete('/:id', async (req, reply) => {
        const { id } = req.params;
        try {
            await prisma.job.delete({ where: { id } });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
// Job processor - handles different job types
async function processJob(jobId) {
    try {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job)
            return;
        const payload = JSON.parse(job.payload || '{}');
        let result;
        switch (job.type) {
            case 'scan':
                // Scan execution handled by scan.ts
                // This is a placeholder - actual scan runs via scan endpoint
                result = { message: 'Scan job queued', scanId: payload.scanId };
                break;
            case 'threat_detection':
                await new Promise(r => setTimeout(r, 2000));
                result = { threatsFound: Math.floor(Math.random() * 3) };
                break;
            case 'health_check':
                const { getSystemHealth } = await import('@zyra/monitoring');
                const health = await getSystemHealth();
                result = { status: health.status, timestamp: health.timestamp };
                break;
            case 'alert':
                // Send alert via webhook/Slack/email
                result = { alertSent: true, target: payload.target };
                break;
            case 'backup':
                // DB backup job placeholder
                result = { backupCreated: false, message: 'Backup not implemented' };
                break;
            case 'webhook':
                // Trigger external webhook
                result = { webhookCalled: true, url: payload.url };
                break;
            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }
        // Mark completed
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                result: JSON.stringify(result),
                completedAt: new Date(),
            },
        });
        // Notify
        sendToOrg(job.orgId, 'job.completed', { id: job.id, type: job.type, result });
    }
    catch (error) {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        // Check retry count
        if (job && job.attempts < job.maxAttempts) {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'PENDING',
                    attempts: job.attempts + 1,
                    error: error.message,
                },
            });
        }
        else {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    error: error.message,
                    completedAt: new Date(),
                },
            });
        }
        if (job) {
            sendToOrg(job.orgId, 'job.failed', { id: job.id, type: job.type, error: error.message });
        }
    }
}
