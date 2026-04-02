import type { FastifyInstance } from 'fastify'
import { getSystemHealth } from '@zyra/monitoring'

export default async function healthRoutes(fastify: FastifyInstance) {
  // Detailed health check (requires auth? maybe not)
  fastify.get('/', async (req, reply) => {
    const health = await getSystemHealth()
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
    reply.status(statusCode)
    
    return {
      success: true,
      data: health
    }
  })
}
