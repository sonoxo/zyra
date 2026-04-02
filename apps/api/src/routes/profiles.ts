import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function profileRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    
  })

  // GET /api/profiles/me - get current user's profile
  fastify.get('/me', async (req, reply) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user!.id },
      })
      return reply.send({ success: true, data: profile })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // PATCH /api/profiles/me - update current user's profile
  fastify.patch('/me', async (req, reply) => {
    const { displayName, bio, website, twitter, instagram, location, isPublic } = req.body as any

    try {
      const profile = await prisma.profile.upsert({
        where: { userId: req.user!.id },
        update: {
          ...(displayName && { displayName }),
          ...(bio !== undefined && { bio }),
          ...(website !== undefined && { website }),
          ...(twitter !== undefined && { twitter }),
          ...(instagram !== undefined && { instagram }),
          ...(location !== undefined && { location }),
          ...(isPublic !== undefined && { isPublic }),
        },
        create: {
          userId: req.user!.id,
          displayName: displayName || req.user!.name,
          bio,
          website,
          twitter,
          instagram,
          location,
          isPublic: isPublic ?? true,
        },
      })
      return reply.send({ success: true, data: profile })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/profiles/:userId - get another user's public profile
  fastify.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId },
      })

      if (!profile) {
        return reply.status(404).send({ success: false, error: 'Profile not found' })
      }

      if (!profile.isPublic) {
        return reply.status(403).send({ success: false, error: 'Profile is private' })
      }

      return reply.send({ success: true, data: profile })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}