import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { logActivity } from './activities.js'
import { triggerWebhook } from '../lib/webhook.js'
import { sendToOrg } from '../websocket/index.js'

const SCAN_SCORES = {
  FULL: { min: 60, max: 100 },
  QUICK: { min: 70, max: 100 },
  SPECIFIC: { min: 50, max: 100 },
}

export default async function scanRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    
  })

  // GET /api/scan - list scans
  fastify.get('/', async (req, reply) => {
    const orgId = (req.query as any)?.orgId || req.user?.orgId
    
    try {
      const scans = await prisma.scan.findMany({
        where: orgId ? { orgId } : {},
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send({ success: true, data: scans })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/scan - create/schedule scan
  fastify.post('/', async (req, reply) => {
    const { type, assetId, target } = req.body as any
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    try {
      const scan = await prisma.scan.create({
        data: {
          type: type || 'QUICK',
          status: 'PENDING',
          orgId,
          assetId: assetId || null,
        },
      })

      await logActivity(prisma, {
        action: 'SCAN_CREATED',
        entityType: 'SCAN',
        entityId: scan.id,
        description: `Created ${type || 'QUICK'} scan`,
        orgId,
        userId: req.user!.id,
      })

      // Trigger webhooks
      await triggerWebhook(orgId, 'scan.created', { id: scan.id, type: scan.type })
      sendToOrg(orgId, 'scan.created', { id: scan.id, type: scan.type })

      return reply.status(201).send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/scan/:id - get scan details
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const scan = await prisma.scan.findUnique({
        where: { id },
        include: { asset: true },
      })

      if (!scan) {
        return reply.status(404).send({ success: false, error: 'Scan not found' })
      }

      return reply.send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/scan/:id/run - run scan (mock for now)
  fastify.post('/:id/run', async (req, reply) => {
    const { id } = req.params as { id: string }
    const orgId = req.user?.orgId

    try {
      const scan = await prisma.scan.update({
        where: { id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      })

      // Simulate scan completion after 2 seconds
      setTimeout(async () => {
        const mockScore = Math.floor(Math.random() * 30) + 70 // 70-100
        
        await prisma.scan.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            score: mockScore,
            completedAt: new Date(),
          },
        })
      }, 2000)

      await logActivity(prisma, {
        action: 'SCAN_STARTED',
        entityType: 'SCAN',
        entityId: id,
        description: `Started scan`,
        orgId: orgId!,
        userId: req.user!.id,
      })

      return reply.send({ success: true, data: scan })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/scan/:id - cancel/delete scan
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.scan.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}