import { authMiddleware } from '../middleware/auth.js';
import { assetsStore } from '../lib/fileStore.js';
export default async function assetRoutes(fastify) {
    await fastify.addHook('onRequest', authMiddleware);
    // GET /api/assets - list assets for org
    fastify.get('/', async (req, reply) => {
        const orgId = req.query?.orgId || req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'orgId required' });
        }
        const assets = assetsStore.findMany(a => a.orgId === orgId);
        return reply.send({ success: true, data: assets });
    });
    // POST /api/assets - create asset
    fastify.post('/', async (req, reply) => {
        const { name, type, url, ip } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No organization selected' });
        }
        if (!name) {
            return reply.status(400).send({ success: false, error: 'Name required' });
        }
        const asset = assetsStore.create({
            name,
            type: type || 'WEBSITE',
            url: url || null,
            orgId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return reply.status(201).send({ success: true, data: asset });
    });
    // GET /api/assets/:id
    fastify.get('/:id', async (req, reply) => {
        const { id } = req.params;
        const asset = assetsStore.findUnique({ id });
        if (!asset) {
            return reply.status(404).send({ success: false, error: 'Asset not found' });
        }
        return reply.send({ success: true, data: asset });
    });
    // DELETE /api/assets/:id
    fastify.delete('/:id', async (req, reply) => {
        const { id } = req.params;
        const deleted = assetsStore.delete({ id });
        if (!deleted) {
            return reply.status(404).send({ success: false, error: 'Asset not found' });
        }
        return reply.send({ success: true, data: { deleted: true } });
    });
}
