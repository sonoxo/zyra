import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

interface OrgBody {
  name: string
  slug?: string
}

interface OrgMemberBody {
  userId: string
  role: string
}

export default async function orgRoutes(fastify: FastifyInstance) {
  // All org routes require auth
  await fastify.addHook('onRequest', async (req, reply) => {
    await authMiddleware(req, reply)
  })

  // GET /api/orgs - list user's organizations
  fastify.get('/', async (req, reply) => {
    try {
      const orgs = await prisma.organizationUser.findMany({
        where: { userId: req.user!.id },
        include: { organization: true },
      })
      return reply.send({ success: true, data: orgs.map(o => o.organization) })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/orgs - create organization
  fastify.post<{ Body: OrgBody }>('/', async (req, reply) => {
    const { name, slug } = req.body
    
    if (!name) {
      return reply.status(400).send({ success: false, error: 'Name required' })
    }

    const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    try {
      const org = await prisma.organization.create({
        data: {
          name,
          slug: orgSlug,
          members: {
            create: {
              userId: req.user!.id,
              role: 'OWNER',
            },
          },
        },
      })
      return reply.status(201).send({ success: true, data: org })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/orgs/:id - get organization details
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const org = await prisma.organization.findFirst({
        where: { 
          id,
          members: { some: { userId: req.user!.id } }
        },
        include: { 
          members: { include: { user: { select: { id: true, email: true, name: true } } } }
        },
      })

      if (!org) {
        return reply.status(404).send({ success: false, error: 'Organization not found' })
      }

      return reply.send({ success: true, data: org })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/orgs/:id/members - add member
  fastify.post<{ Body: OrgMemberBody }('/:id/members', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.body

    // Only OWNER and ADMIN can add members
    const membership = await prisma.organizationUser.findFirst({
      where: { 
        organizationId: id, 
        userId: req.user!.id,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Only admins can add members' })
    }

    try {
      const member = await prisma.organizationUser.create({
        data: {
          organizationId: id,
          userId,
          role: role || 'MEMBER',
        },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
      return reply.status(201).send({ success: true, data: member })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  }))

  // PATCH /api/orgs/:id/members/:userId - update member role
  fastify.patch('/:id/members/:userId', async (req, reply) => {
    const { id, userId } = req.params as { id: string, userId: string }
    const { role } = req.body as { role: string }

    // Only OWNER can change roles
    const membership = await prisma.organizationUser.findFirst({
      where: { 
        organizationId: id, 
        userId: req.user!.id,
        role: 'OWNER'
      }
    })

    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Only owner can change roles' })
    }

    try {
      const updated = await prisma.organizationUser.update({
        where: { organizationId_userId: { organizationId: id, userId } },
        data: { role },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
      return reply.send({ success: true, data: updated })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // DELETE /api/orgs/:id/members/:userId - remove member
  fastify.delete('/:id/members/:userId', async (req, reply) => {
    const { id, userId } = req.params as { id: string, userId: string }

    // Only OWNER can remove members
    const membership = await prisma.organizationUser.findFirst({
      where: { 
        organizationId: id, 
        userId: req.user!.id,
        role: 'OWNER'
      }
    })

    if (!membership) {
      return reply.status(403).send({ success: false, error: 'Only owner can remove members' })
    }

    try {
      await prisma.organizationUser.delete({
        where: { organizationId_userId: { organizationId: id, userId } },
      })
      return reply.send({ success: true })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}