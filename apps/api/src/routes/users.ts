import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

export default async function userRoutes(fastify: FastifyInstance) {
  // Apply auth to all routes
  await fastify.addHook('onRequest', async (req, reply) => {
    // Skip auth for GET /users (will add later if needed)
  })

  // GET /api/users - list users (admin only)
  fastify.get('/', async (req, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      return reply.send({ success: true, data: users })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/users/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { profile: true },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isVerified: true,
          createdAt: true,
          profile: true,
        },
      })

      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' })
      }

      return reply.send({ success: true, data: user })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // PATCH /api/users/:id - update user role (admin only)
  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { role } = req.body as { role?: string }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: role ? { role } : {},
        select: { id: true, email: true, role: true },
      })

      return reply.send({ success: true, data: user })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}