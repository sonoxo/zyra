import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'

export function requestIdMiddleware(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // Use existing request ID header or generate new
    const id = req.headers['x-request-id'] as string || randomUUID()
    req.headers['x-request-id'] = id
    
    // Add request ID to reply headers
    reply.header('X-Request-ID', id)
    
    // Attach to request for downstream use
    ;(req as any).id = id
  })
}
