import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { sendToOrg } from '../websocket/index.js'
import { getSystemHealth } from '@zyra/monitoring'

// In-memory job queue (for production, use Bull/Redis)
interface Job {
  id: string
  type: string
  data: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  orgId: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: any
  error?: string
}

const jobQueue: Job[] = []

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

    const jobs = jobQueue.filter(j => j.orgId === orgId).slice(-50)
    return reply.send({ success: true, data: jobs })
  })

  // POST /api/jobs - create a job
  fastify.post('/', async (req, reply) => {
    const { type, data } = req.body as any
    const orgId = req.user?.orgId
    const userId = req.user?.id

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No org selected' })
    }

    if (!type) {
      return reply.status(400).send({ success: false, error: 'type required' })
    }

    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      status: 'pending',
      orgId,
      createdAt: new Date(),
    }

    jobQueue.push(job)
    
    // Notify via WebSocket
    sendToOrg(orgId, 'job.created', { id: job.id, type })

    // Process job asynchronously
    processJob(job).catch(console.error)

    return reply.status(201).send({ success: true, data: job })
  })

  // GET /api/jobs/:id - get job status
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const job = jobQueue.find(j => j.id === id)

    if (!job) {
      return reply.status(404).send({ success: false, error: 'Job not found' })
    }

    return reply.send({ success: true, data: job })
  })
}

async function processJob(job: Job) {
  job.status = 'running'
  job.startedAt = new Date()

  try {
    let result: any

    switch (job.type) {
      case 'scan':
        // Simulate scan
        await new Promise(r => setTimeout(r, 3000))
        const score = Math.floor(Math.random() * 30) + 70
        result = { score, vulnerabilities: Math.floor(Math.random() * 5) }
        
        // Update scan in DB
        await prisma.scan.updateMany({
          where: { id: job.data.scanId },
          data: { status: 'COMPLETED', score, completedAt: new Date() }
        })
        break

      case 'threat_detection':
        await new Promise(r => setTimeout(r, 2000))
        result = { threatsFound: Math.floor(Math.random() * 3) }
        break

      case 'health_check':
        const health = await getSystemHealth()
        result = { status: health.status, timestamp: health.timestamp }
        // If unhealthy, log error for alerting
        if (health.status === 'unhealthy') {
          console.error('[Health Check] Unhealthy:', JSON.stringify(health))
        }
        break

      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    job.status = 'completed'
    job.result = result
    job.completedAt = new Date()

    // Notify
    sendToOrg(job.orgId, 'job.completed', { id: job.id, type: job.type, result })

  } catch (error: any) {
    job.status = 'failed'
    job.error = error.message
    job.completedAt = new Date()

    sendToOrg(job.orgId, 'job.failed', { id: job.id, type: job.type, error: error.message })
  }
}
