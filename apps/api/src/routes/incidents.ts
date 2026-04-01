import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Incident } from '@zyra/types'
import { broadcast } from '../websocket/index.js'

const incidents: Incident[] = []

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (req: FastifyRequest, reply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const orgIncidents = incidents.filter(i => i.orgId === orgId)
    reply.send({ success: true, data: orgIncidents })
  })
  
  fastify.post('/', async (req: FastifyRequest<{ Body: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'> }>, reply) => {
    const newIncident: Incident = {
      ...req.body,
      id: `incident_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    incidents.push(newIncident)
    
    broadcast('incident:new', newIncident)
    reply.status(201).send({ success: true, data: newIncident })
  })
  
  fastify.patch('/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<Incident> }>, reply) => {
    const { id } = req.params
    const index = incidents.findIndex(i => i.id === id)
    
    if (index > -1) {
      incidents[index] = { ...incidents[index], ...req.body, updatedAt: new Date() }
      broadcast('incident:updated', incidents[index])
      reply.send({ success: true, data: incidents[index] })
    } else {
      reply.status(404).send({ success: false, error: 'Incident not found' })
    }
  })
  
  fastify.post('/:id/assign', async (req: FastifyRequest<{ Params: { id: string }; Body: { userId: string } }>, reply) => {
    const { id } = req.params
    const { userId } = req.body
    const index = incidents.findIndex(i => i.id === id)
    
    if (index > -1) {
      incidents[index].assignedToId = userId
      broadcast('incident:updated', incidents[index])
      reply.send({ success: true, data: incidents[index] })
    } else {
      reply.status(404).send({ success: false, error: 'Incident not found' })
    }
  })
}
