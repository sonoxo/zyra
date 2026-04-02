import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function notificationRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    
  })

  // GET /api/notifications - list user's notifications
  fastify.get('/', async (req, reply) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send({ success: true, data: notifications })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/notifications/unread - get unread count
  fastify.get('/unread', async (req, reply) => {
    try {
      const count = await prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      })
      return reply.send({ success: true, data: { count } })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // PATCH /api/notifications/:id/read - mark as read
  fastify.patch('/:id/read', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.notification.update({
        where: { id, userId: req.user!.id },
        data: { isRead: true },
      })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // PATCH /api/notifications/read-all - mark all as read
  fastify.patch('/read-all', async (req, reply) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true },
      })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/notifications/:id - delete notification
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      await prisma.notification.delete({
        where: { id, userId: req.user!.id },
      })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}

// Helper to create notification (used by other routes)
export async function createNotification(
  prisma: any,
  userId: string,
  type: string,
  title: string,
  message?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message },
  })
}