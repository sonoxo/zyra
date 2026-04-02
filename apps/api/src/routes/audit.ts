import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

// Audit log for tracking all system actions
export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  userId?: string,
  orgId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        orgId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('[Audit] Failed to log:', error)
  }
}

export default async function auditRoutes(fastify: FastifyInstance) {
  // GET /api/audit - list audit logs (admin only)
  fastify.get('/', async (req, reply) => {
    const { entityType, action, userId, orgId, limit = '50' } = req.query as any
    const orgIdSelected = orgId || req.user?.orgId

    // Only admins can view audit logs
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
      return reply.status(403).send({ success: false, error: 'Admin only' })
    }

    try {
      const where: any = {}
      if (entityType) where.entityType = entityType
      if (action) where.action = action
      if (userId) where.userId = userId
      if (orgIdSelected) where.orgId = orgIdSelected

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit) || 50,
      })

      return reply.send({ success: true, data: logs })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/audit/:id - get single audit log
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const log = await prisma.auditLog.findUnique({ where: { id } })

      if (!log) {
        return reply.status(404).send({ success: false, error: 'Log not found' })
      }

      return reply.send({ success: true, data: log })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}