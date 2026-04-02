import { randomUUID } from 'crypto';
export function requestIdMiddleware(fastify) {
    fastify.addHook('onRequest', async (req, reply) => {
        // Use existing request ID header or generate new
        const id = req.headers['x-request-id'] || randomUUID();
        req.headers['x-request-id'] = id;
        // Add request ID to reply headers
        reply.header('X-Request-ID', id);
        req.id = id;
    });
}
