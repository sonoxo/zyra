import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import crypto from 'crypto'

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', authMiddleware)

  // GET /api/keys - list user's API keys
  fastify.get('/', async (req, reply) => {
    try {
      const keys = await prisma.apiKey.findMany({
        where: { userId: req.user!.id },
        select: {
          id: true,
          name: true,
          prefix: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: keys })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/keys - create new API key
  fastify.post('/', async (req, reply) => {
    const { name, expiresInDays } = req.body as { name?: string; expiresInDays?: number }
    const userId = req.user!.id

    // Generate secure key
    const key = `zyra_${crypto.randomBytes(32).toString('hex')}`
    const prefix = key.substring(0, 12)
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex')

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    try {
      const apiKey = await prisma.apiKey.create({
        data: {
          name: name || 'My API Key',
          key: hashedKey,
          prefix,
          userId,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          expiresAt: true,
          createdAt: true,
        },
      })

      // Return the full key only once
      return reply.status(201).send({
        success: true,
        data: {
          ...apiKey,
          key, // Full key returned only on creation
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/keys/:id - revoke API key
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.apiKey.delete({
        where: { id, userId: req.user!.id },
      })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}

// Verify API key middleware
export async function verifyApiKey(fastify: FastifyInstance) {
  fastify.decorate('verifyApiKey', async function (req: FastifyRequest, reply: FastifyReply) {
    const apiKeyHeader = req.headers['x-api-key'] as string

    if (!apiKeyHeader) {
      return reply.status(401).send({ success: false, error: 'No API key provided' })
    }

    try {
      const hashedKey = crypto.createHash('sha256').update(apiKeyHeader).digest('hex')
      
      const apiKey = await prisma.apiKey.findFirst({
        where: { key: hashedKey },
        include: { user: true },
      })

      if (!apiKey) {
        return reply.status(401).send({ success: false, error: 'Invalid API key' })
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return reply.status(401).send({ success: false, error: 'API key expired' })
      }

      // Update last used
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })

      // Attach user to request
      req.user = {
        id: apiKey.user.id,
        email: apiKey.user.email,
        role: apiKey.user.role,
      }

    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid API key' })
    }
  })
}