import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Threat, Severity } from '@zyra/types'
import { broadcast } from '../websocket/index.js'

const threats: Threat[] = []

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req: FastifyRequest, reply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const orgThreats = threats.filter(t => t.assetId.startsWith('asset_'))
    reply.send({ success: true, data: orgThreats })
  })
  
  fastify.post('/', async (req: FastifyRequest<{ Body: Omit<Threat, 'id' | 'createdAt'> }>, reply) => {
    const newThreat: Threat = {
      ...req.body,
      id: `threat_${Date.now()}`,
      createdAt: new Date(),
    }
    threats.push(newThreat)
    
    broadcast('threat:new', newThreat)
    
    if (newThreat.severity === 'CRITICAL') {
      broadcast('alert:critical', newThreat)
    }
    
    reply.status(201).send({ success: true, data: newThreat })
  })
  
  fastify.patch('/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<Threat> }>, reply) => {
    const { id } = req.params
    const index = threats.findIndex(t => t.id === id)
    
    if (index > -1) {
      threats[index] = { ...threats[index], ...req.body }
      broadcast('threat:updated', threats[index])
      reply.send({ success: true, data: threats[index] })
    } else {
      reply.status(404).send({ success: false, error: 'Threat not found' })
    }
  })
}
