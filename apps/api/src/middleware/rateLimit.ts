import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const DEFAULT_LIMIT = 100
const DEFAULT_WINDOW_MS = 60 * 1000 // 1 minute

export function rateLimit(options: { limit?: number; windowMs?: number } = {}) {
  const limit = options.limit || DEFAULT_LIMIT
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    const key = `${ip}:${req.url}`
    const now = Date.now()

    let record = rateLimitStore.get(key)
    
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs }
      rateLimitStore.set(key, record)
    }

    record.count++

    if (record.count > limit) {
      reply.status(429).send({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      })
      return reply
    }

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', limit)
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - record.count))
    reply.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString())
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Every 5 minutes