import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
export async function logActivity(prisma, data) {
    return prisma.activity.create({
        data: {
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId || null,
            description: data.description || null,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            orgId: data.orgId,
            userId: data.userId,
        },
    });
}
export default async function activityRoutes(fastify) {
    await fastify.addHook('onRequest', authMiddleware);
    // GET /api/activities - list activities for org
    fastify.get('/', async (req, reply) => {
        const orgId = req.query?.orgId || req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        try {
            const activities = await prisma.activity.findMany({
                where: { orgId },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            return reply.send({ success: true, data: activities });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/activities - log activity
    fastify.post('/', async (req, reply) => {
        const { action, entityType, entityId, description, metadata } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        try {
            const activity = await prisma.activity.create({
                data: {
                    action,
                    entityType,
                    entityId,
                    description,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                    orgId,
                    userId: req.user.id,
                },
            });
            return reply.status(201).send({ success: true, data: activity });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
