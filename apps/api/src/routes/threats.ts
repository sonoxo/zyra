import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { triggerWebhook } from '../lib/webhook.js'
import { sendToOrg } from '../websocket/index.js'

export default async function threatRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', authMiddleware)

  // GET /api/threats - list threats
  fastify.get('/', async (req, reply) => {
    const orgId = (req.query as any)?.orgId || req.user?.orgId
    
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'orgId required' })
    }

    try {
      const threats = await prisma.threat.findMany({
        where: { orgId },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: threats })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/threats - create threat (usually from scan)
  fastify.post('/', async (req, reply) => {
    const { title, description, severity, assetId } = req.body as any
    const orgId = req.user?.orgId

    if (!orgId || !assetId) {
      return reply.status(400).send({ success: false, error: 'orgId and assetId required' })
    }

    try {
      const threat = await prisma.threat.create({
        data: {
          title,
          description: description || null,
          severity: severity || 'MEDIUM',
          status: 'OPEN',
          assetId,
          orgId,
        },
      })

      // Trigger webhooks
      await triggerWebhook(orgId, 'threat.created', { id: threat.id, title: threat.title, severity: threat.severity })
      sendToOrg(orgId, 'threat.created', { id: threat.id, title: threat.title, severity: threat.severity })
      return reply.status(201).send({ success: true, data: threat })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // PATCH /api/threats/:id - update threat status
  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }

    try {
      const threat = await prisma.threat.update({
        where: { id },
        data: status === 'RESOLVED' ? { status, resolvedAt: new Date() } : { status },
      })
      return reply.send({ success: true, data: threat })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/threats/stats - get threat statistics
  fastify.get('/stats', async (req, reply) => {
    const orgId = req.user?.orgId
    
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'orgId required' })
    }

    try {
      const [total, open, critical, high] = await Promise.all([
        prisma.threat.count({ where: { orgId } }),
        prisma.threat.count({ where: { orgId, status: 'OPEN' } }),
        prisma.threat.count({ where: { orgId, severity: 'CRITICAL', status: 'OPEN' } }),
        prisma.threat.count({ where: { orgId, severity: 'HIGH', status: 'OPEN' } }),
      ])

      return reply.send({
        success: true,
        data: { total, open, critical, high },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}