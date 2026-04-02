import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { triggerWebhook } from '../lib/webhook.js'
import { sendToOrg } from '../websocket/index.js'

export default async function assetRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    await authMiddleware(req, reply)
  })

  // GET /api/assets - list assets for org
  fastify.get('/', async (req, reply) => {
    const orgId = (req.query as any)?.orgId || req.user?.orgId
    
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'orgId required' })
    }

    try {
      const assets = await prisma.asset.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: assets })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/assets - create asset
  fastify.post('/', async (req, reply) => {
    const { name, type, url, ip } = req.body as any
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    if (!name) {
      return reply.status(400).send({ success: false, error: 'Name required' })
    }

    try {
      const asset = await prisma.asset.create({
        data: {
          name,
          type: type || 'WEBSITE',
          url: url || null,
          ip: ip || null,
          orgId,
          status: 'ACTIVE',
        },
      })

      // Trigger webhooks
      await triggerWebhook(orgId, 'asset.created', { id: asset.id, name: asset.name, type: asset.type })

      // Real-time notification
      sendToOrg(orgId, 'asset.created', { id: asset.id, name: asset.name })

      return reply.status(201).send({ success: true, data: asset })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/assets/:id - get asset
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const asset = await prisma.asset.findUnique({
        where: { id },
        include: { threats: true, scans: { take: 5, orderBy: { createdAt: 'desc' } } },
      })

      if (!asset) {
        return reply.status(404).send({ success: false, error: 'Asset not found' })
      }

      return reply.send({ success: true, data: asset })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/assets/:id - delete asset
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.asset.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}