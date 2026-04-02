import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
export default async function webhookRoutes(fastify) {
    await fastify.addHook('onRequest', async (req, reply) => {
    });
    // GET /api/webhooks - list webhooks
    fastify.get('/', async (req, reply) => {
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        try {
            const webhooks = await prisma.webhook.findMany({
                where: { orgId },
                orderBy: { createdAt: 'desc' },
            });
            return reply.send({ success: true, data: webhooks });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/webhooks - create webhook
    fastify.post('/', async (req, reply) => {
        const { name, url, events, secret } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        if (!name || !url || !events) {
            return reply.status(400).send({ success: false, error: 'name, url, events required' });
        }
        try {
            const webhook = await prisma.webhook.create({
                data: {
                    name,
                    url,
                    events,
                    secret: secret || null,
                    orgId,
                },
            });
            return reply.status(201).send({ success: true, data: webhook });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // DELETE /api/webhooks/:id - delete webhook
    fastify.delete('/:id', async (req, reply) => {
        const { id } = req.params;
        const orgId = req.user?.orgId;
        try {
            await prisma.webhook.delete({
                where: { id, orgId },
            });
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/webhooks/test - test a webhook (ping)
    fastify.post('/test', async (req, reply) => {
        const { url, secret } = req.body;
        if (!url) {
            return reply.status(400).send({ success: false, error: 'url required' });
        }
        const payload = { event: 'test', timestamp: new Date().toISOString(), data: {} };
        const headers = { 'Content-Type': 'application/json' };
        if (secret) {
            const sig = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
            headers['X-Zyra-Signature'] = sig;
        }
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const ok = res.ok;
            return reply.send({ success: ok, status: res.status });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
