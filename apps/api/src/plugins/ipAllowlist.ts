import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

// Configuration
const ALLOWED_IPS = (process.env.ALLOWED_ADMIN_IPS || '').split(',').filter(Boolean)
const ENABLE_IP_CHECK = process.env.ENABLE_IP_ALLOWLIST === 'true'

declare module 'fastify' {
  interface FastifyRequest {
    clientIp?: string
  }
}

async function ipAllowlistPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!ENABLE_IP_CHECK || ALLOWED_IPS.length === 0) {
      return // Allow all if not configured
    }

    // Get client IP (handle proxies)
    const clientIp = request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
      || request.headers['x-real-ip']?.toString()
      || request.ip

    request.clientIp = clientIp

    // Check if route requires admin access
    const isAdminRoute = request.url.startsWith('/api/admin') || 
                        request.url.startsWith('/api/users') && request.method === 'DELETE'

    if (isAdminRoute) {
      const isAllowed = ALLOWED_IPS.some(allowed => 
        allowed.trim() === clientIp || allowed.trim() === `/${clientIp}`
      )

      if (!isAllowed) {
        fastify.log.warn(`Blocked admin access from IP: ${clientIp}`)
        return reply.status(403).send({ 
          error: 'Access denied',
          message: 'Your IP is not authorized for this action'
        })
      }
    }
  })
}

export default fp(ipAllowlistPlugin, {
  name: 'ip-allowlist',
  fastify: '4.x'
})