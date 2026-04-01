import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { Asset, AssetType, AssetStatus } from '@zyra/types'

// In-memory store (replace with Prisma/PostgreSQL)
const assets: Asset[] = []

const assetRoutes = {
  method: 'GET',
  url: '/',
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const orgAssets = assets.filter(a => a.orgId === orgId)
    reply.send({ success: true, data: orgAssets })
  },
}

export default async function (fastify: FastifyInstance) {
  fastify.get('/', assetRoutes.handler)
  
  fastify.post('/', async (req: FastifyRequest<{ Body: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> }>, reply) => {
    const orgId = (req.headers['x-org-id'] as string) || 'org_1'
    const newAsset: Asset = {
      ...req.body,
      id: `asset_${Date.now()}`,
      orgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    assets.push(newAsset)
    reply.status(201).send({ success: true, data: newAsset })
  })
  
  fastify.delete('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = req.params
    const index = assets.findIndex(a => a.id === id)
    if (index > -1) {
      assets.splice(index, 1)
      reply.send({ success: true })
    } else {
      reply.status(404).send({ success: false, error: 'Asset not found' })
    }
  })
}
