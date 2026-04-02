import { prisma } from '../lib/prisma.js';
export default async function notificationRoutes(fastify) {
    await fastify.addHook('onRequest', async (req, reply) => {
    });
    // GET /api/notifications - list user's notifications
    fastify.get('/', async (req, reply) => {
        try {
            const notifications = await prisma.notification.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            return reply.send({ success: true, data: notifications });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // GET /api/notifications/unread - get unread count
    fastify.get('/unread', async (req, reply) => {
        try {
            const count = await prisma.notification.count({
                where: { userId: req.user.id, isRead: false },
            });
            return reply.send({ success: true, data: { count } });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // PATCH /api/notifications/:id/read - mark as read
    fastify.patch('/:id/read', async (req, reply) => {
        const { id } = req.params;
        try {
            await prisma.notification.update({
                where: { id, userId: req.user.id },
                data: { isRead: true },
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // PATCH /api/notifications/read-all - mark all as read
    fastify.patch('/read-all', async (req, reply) => {
        try {
            await prisma.notification.updateMany({
                where: { userId: req.user.id, isRead: false },
                data: { isRead: true },
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // DELETE /api/notifications/:id - delete notification
    fastify.delete('/:id', async (req, reply) => {
        const { id } = req.params;
        try {
            await prisma.notification.delete({
                where: { id, userId: req.user.id },
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
// Helper to create notification (used by other routes)
export async function createNotification(prisma, userId, type, title, message) {
    return prisma.notification.create({
        data: { userId, type, title, message },
    });
}
