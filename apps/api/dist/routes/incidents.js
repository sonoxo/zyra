import { prisma } from '../lib/prisma.js';
import { triggerWebhook } from '../lib/webhook.js';
import { sendToOrg } from '../websocket/index.js';
export default async function incidentRoutes(fastify) {
    await fastify.addHook('onRequest', async (req, reply) => {
    });
    // GET /api/incidents - list incidents
    fastify.get('/', async (req, reply) => {
        const orgId = req.query?.orgId || req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        try {
            const incidents = await prisma.incident.findMany({
                where: { orgId },
                include: { assignedTo: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            });
            return reply.send({ success: true, data: incidents });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/incidents - create incident
    fastify.post('/', async (req, reply) => {
        const { title, description, priority, assignedToId } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No organization selected' });
        }
        if (!title) {
            return reply.status(400).send({ success: false, error: 'Title required' });
        }
        try {
            const incident = await prisma.incident.create({
                data: {
                    title,
                    description: description || null,
                    priority: priority || 'MEDIUM',
                    status: 'OPEN',
                    orgId,
                    assignedToId: assignedToId || null,
                },
            });
            // Trigger webhooks
            await triggerWebhook(orgId, 'incident.created', { id: incident.id, title: incident.title, priority: incident.priority });
            sendToOrg(orgId, 'incident.created', { id: incident.id, title: incident.title, priority: incident.priority });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // PATCH /api/incidents/:id - update incident
    fastify.patch('/:id', async (req, reply) => {
        const { id } = req.params;
        const { status, priority, assignedToId } = req.body;
        try {
            const incident = await prisma.incident.update({
                where: { id },
                data: {
                    ...(status && { status }),
                    ...(priority && { priority }),
                    ...(assignedToId !== undefined && { assignedToId }),
                },
            });
            return reply.send({ success: true, data: incident });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // GET /api/incidents/stats - get incident statistics
    fastify.get('/stats', async (req, reply) => {
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        try {
            const [total, open, critical] = await Promise.all([
                prisma.incident.count({ where: { orgId } }),
                prisma.incident.count({ where: { orgId, status: 'OPEN' } }),
                prisma.incident.count({ where: { orgId, priority: 'CRITICAL', status: 'OPEN' } }),
            ]);
            return reply.send({
                success: true,
                data: { total, open, critical },
            });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
