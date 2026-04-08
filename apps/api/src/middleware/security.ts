import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export function securityHeaders(fastify: FastifyInstance) {
  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply) => {
    // Security headers
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // Content Security Policy
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;")
    
    // Remove server version header
    reply.header('X-Powered-By', undefined)
  })
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove null bytes and trim
    return input.replace(/\0/g, '').trim()
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  return input
}

// Rate limit store (simple in-memory)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100 // requests per window

export function rateLimitMiddleware(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limit for health checks
    if (req.url === '/health' || req.url === '/api/health') {
      return
    }

    const clientId = req.ip || 'unknown'
    const now = Date.now()
    const record = rateLimitStore.get(clientId)

    if (!record || now > record.resetAt) {
      rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
      return
    }

    if (record.count >= RATE_LIMIT_MAX) {
      reply.status(429).send({
        success: false,
        error: 'Too many requests. Please try again later.'
      })
      return
    }

    record.count++
  })
}