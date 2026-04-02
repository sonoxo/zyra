import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

export default async function jobRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    await authMiddleware(req, reply)
  })

  // GET /api/jobs - list jobs
  fastify.get('/', async (req, reply) => {
    const orgId = req.user?.orgId
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No org selected' })
    }

    try {
      const jobs = await prisma.job.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send({ success: true, data: jobs })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/jobs/:id - get job details
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const job = await prisma.job.findUnique({ where: { id } })
      if (!job) {
        return reply.status(404).send({ success: false, error: 'Job not found' })
      }
      return reply.send({ success: true, data: job })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/jobs - create a job (queue)
  fastify.post('/', async (req, reply) => {
    const { type, payload } = req.body as any
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No org selected' })
    }
    if (!type) {
      return reply.status(400).send({ success: false, error: 'type required' })
    }

    try {
      const job = await prisma.job.create({
        data: {
          type,
          payload: JSON.stringify(payload || {}),
          status: 'PENDING',
          orgId,
        },
      })
      return reply.status(201).send({ success: true, data: job })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/jobs/:id/run - manually trigger a pending job
  fastify.post('/:id/run', async (req, reply) => {
    const { id } = req.params as { id: string }

    try {
      const job = await prisma.job.update({
        where: { id },
        data: { status: 'RUNNING', startedAt: new Date() },
      })
      // Simulate processing: wait 2 seconds then mark complete
      setTimeout(async () => {
        await prisma.job.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date(), result: JSON.stringify({ done: true }) },
        })
      }, 2000)

      return reply.send({ success: true, data: job })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}
