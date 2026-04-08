/**
 * @zyra/fastify-security
 * Fastify security middleware - headers, rate limiting, input sanitization
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export interface SecurityOptions {
  corsOrigins?: string[]
  rateLimitWindow?: number
  rateLimitMax?: number
  enableCSP?: boolean
}

// Simple in-memory rate limit store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Add security headers to all responses
 */
export function securityHeaders(fastify: FastifyInstance, opts: SecurityOptions) {
  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    if (opts.enableCSP !== false) {
      reply.header('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;")
    }
    
    reply.header('X-Powered-By', undefined)
  })
}

/**
 * Rate limiting middleware
 */
export function rateLimit(fastify: FastifyInstance, opts: SecurityOptions) {
  const windowMs = opts.rateLimitWindow || 60 * 1000 // 1 minute
  const maxRequests = opts.rateLimitMax || 100

  fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limit for health checks
    if (req.url === '/health' || req.url === '/api/health') return

    const clientId = req.ip || 'unknown'
    const now = Date.now()
    const record = rateLimitStore.get(clientId)

    if (!record || now > record.resetAt) {
      rateLimitStore.set(clientId, { count: 1, resetAt: now + windowMs })
      return
    }

    if (record.count >= maxRequests) {
      reply.status(429).send({
        success: false,
        error: 'Too many requests. Please try again later.'
      })
      return
    }

    record.count++
  })
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
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

/**
 * Main plugin function
 */
export async function fastifySecurity(fastify: FastifyInstance, opts: SecurityOptions) {
  securityHeaders(fastify, opts)
  rateLimit(fastify, opts)
  
  // Sanitize body on POST/PUT
  fastify.addHook('preHandler', async (req: FastifyRequest) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body = sanitizeInput(req.body)
    }
  })
}

export default fastifySecurity
