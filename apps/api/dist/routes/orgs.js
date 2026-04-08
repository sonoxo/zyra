import { authMiddleware } from '../middleware/auth.js';
import { orgsStore } from '../lib/fileStore.js';
export default async function orgRoutes(fastify) {
    await fastify.addHook('onRequest', authMiddleware);
    // GET /api/orgs - list orgs
    fastify.get('/', async (req, reply) => {
        const orgs = orgsStore.findMany();
        return reply.send({ success: true, data: orgs });
    });
    // GET /api/orgs/:id
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        const org = orgsStore.findUnique({ id });
        if (!org) {
            return reply.status(404).send({ success: false, error: 'Organization not found' });
        }
        return reply.send({ success: true, data: org });
    });
    // PUT /api/orgs/:id - update org
    fastify.put('/:id', async (req, reply) => {
        const { id } = req.params;
        const { name, plan } = req.body;
        const org = orgsStore.update({ id }, { name, plan, updatedAt: new Date().toISOString() });
        if (!org) {
            return reply.status(404).send({ success: false, error: 'Organization not found' });
        }
        return reply.send({ success: true, data: org });
    });
}
