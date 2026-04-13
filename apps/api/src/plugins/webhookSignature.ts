import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import crypto from 'crypto'

interface WebhookSignatureOptions {
  headerName?: string
  signatureAlgorithm?: 'sha256' | 'sha384' | 'sha512'
  secretEnvVar?: string
}

async function webhookSignaturePlugin(fastify: FastifyInstance, opts: WebhookSignatureOptions) {
  const {
    headerName = 'x-webhook-signature',
    signatureAlgorithm = 'sha256',
    secretEnvVar = 'WEBHOOK_SECRET',
  } = opts

  const WEBHOOK_SECRET = process.env[secretEnvVar] || ''

  fastify.decorate('verifyWebhookSignature', async (request: FastifyRequest, reply: FastifyReply) => {
    // If no secret configured, skip verification (not recommended for production)
    if (!WEBHOOK_SECRET) {
      fastify.log.warn('⚠️ No webhook secret configured - signature verification disabled')
      return
    }

    // Only verify for webhook routes
    if (!request.url.startsWith('/api/webhooks')) {
      return
    }

    const signature = request.headers[headerName.toLowerCase()] as string | undefined
    
    if (!signature) {
      fastify.log.warn(`Missing webhook signature on ${request.url}`)
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing webhook signature'
      })
    }

    // Compute expected signature
    const payload = JSON.stringify(request.body)
    const expectedSignature = crypto
      .createHmac(signatureAlgorithm, WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      fastify.log.warn(`Invalid webhook signature from ${request.ip}`)
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      })
    }
  })

  // Add hook to verify on every webhook request
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip for GET requests (health checks)
    if (request.method === 'GET') return
    
    await fastify.verifyWebhookSignature(request, reply)
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyWebhookSignature: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(webhookSignaturePlugin, {
  name: 'webhook-signature',
  fastify: '4.x'
})

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature'