import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
export default async function orgRoutes(fastify) {
    // All org routes require auth
    await fastify.addHook('onRequest', authMiddleware);
    // GET /api/orgs - list user's organizations
    fastify.get('/', async (req, reply) => {
        try {
            const orgs = await prisma.organizationUser.findMany({
                where: { userId: req.user.id },
                include: { organization: true },
            });
            return reply.send({ success: true, data: orgs.map((o) => o.organization) });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/orgs - create organization
    fastify.post('/', async (req, reply) => {
        const { name, slug } = req.body;
        if (!name) {
            return reply.status(400).send({ success: false, error: 'Name required' });
        }
        const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        try {
            const org = await prisma.organization.create({
                data: {
                    name,
                    slug: orgSlug,
                    members: {
                        create: {
                            userId: req.user.id,
                            role: 'OWNER',
                        },
                    },
                },
            });
            return reply.status(201).send({ success: true, data: org });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // GET /api/orgs/:id - get organization details
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        try {
            const org = await prisma.organization.findFirst({
                where: {
                    id,
                    members: { some: { userId: req.user.id } }
                },
                include: {
                    members: { include: { user: { select: { id: true, email: true, name: true, avatar: true } } } },
                    assets: true,
                    _count: { select: { threats: true, incidents: true, scans: true } },
                },
            });
            if (!org) {
                return reply.status(404).send({ success: false, error: 'Organization not found' });
            }
            return reply.send({ success: true, data: org });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/orgs/:id/members - add member
    fastify.post('/:id/members', async (req, reply) => {
        const { id } = req.params;
        const { userId, role } = req.body;
        // Only OWNER and ADMIN can add members
        const membership = await prisma.organizationUser.findFirst({
            where: {
                organizationId: id,
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] }
            }
        });
        if (!membership) {
            return reply.status(403).send({ success: false, error: 'Only admins can add members' });
        }
        try {
            if (!userId) {
                return reply.status(400).send({ success: false, error: 'userId required' });
            }
            const member = await prisma.organizationUser.create({
                data: {
                    organizationId: id,
                    userId,
                    role: role || 'MEMBER',
                },
                include: { user: { select: { id: true, email: true, name: true } } },
            });
            return reply.status(201).send({ success: true, data: member });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // PATCH /api/orgs/:id/members/:userId - update member role
    fastify.patch('/:id/members/:userId', async (req, reply) => {
        const { id, userId } = req.params;
        const { role } = req.body;
        // Only OWNER can change roles
        const membership = await prisma.organizationUser.findFirst({
            where: {
                organizationId: id,
                userId: req.user.id,
                role: 'OWNER'
            }
        });
        if (!membership) {
            return reply.status(403).send({ success: false, error: 'Only owner can change roles' });
        }
        try {
            const updated = await prisma.organizationUser.update({
                where: { userId_organizationId: { organizationId: id, userId } },
                data: { role },
                include: { user: { select: { id: true, email: true, name: true } } },
            });
            return reply.send({ success: true, data: updated });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // DELETE /api/orgs/:id/members/:userId - remove member
    fastify.delete('/:id/members/:userId', async (req, reply) => {
        const { id, userId } = req.params;
        // Only OWNER can remove members
        const membership = await prisma.organizationUser.findFirst({
            where: {
                organizationId: id,
                userId: req.user.id,
                role: 'OWNER'
            }
        });
        if (!membership) {
            return reply.status(403).send({ success: false, error: 'Only owner can remove members' });
        }
        try {
            await prisma.organizationUser.delete({
                where: { userId_organizationId: { organizationId: id, userId } },
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
