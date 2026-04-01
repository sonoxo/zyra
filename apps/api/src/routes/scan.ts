import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Scan, ScanType } from '@zyra/types'
import { broadcast } from '../websocket/index.js'

// In-memory store
const scans: Scan[] = []

const scanRoutes = {
  method: 'GET',
  url: '/',
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const orgScans = scans.filter(s => s.orgId === orgId)
    reply.send({ success: true, data: orgScans })
  },
}

export default async function (fastify: FastifyInstance) {
  fastify.get('/', scanRoutes.handler)
  
  fastify.post('/', async (req: FastifyRequest<{ Body: { assetId: string; type: ScanType } }>, reply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const { assetId, type } = req.body
    
    const newScan: Scan = {
      id: `scan_${Date.now()}`,
      type: type || 'QUICK',
      status: 'RUNNING',
      orgId,
      createdAt: new Date(),
    }
    
    scans.push(newScan)
    
    // Simulate scan completion
    setTimeout(() => {
      newScan.status = 'COMPLETED'
      newScan.score = Math.floor(Math.random() * 40) + 60
      newScan.results = {
        vulnerabilities: Math.floor(Math.random() * 10),
        openPorts: Math.floor(Math.random() * 5),
        sslIssues: Math.floor(Math.random() * 3),
        complianceIssues: [],
      }
      
      broadcast('scan:completed', newScan)
    }, 5000)
    
    reply.status(201).send({ success: true, data: newScan })
  })
}
