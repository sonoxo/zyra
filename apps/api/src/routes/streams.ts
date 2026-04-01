import type { FastifyInstance } from 'fastify'

interface Stream {
  id: string
  userId: string
  title: string
  description?: string
  category?: string
  thumbnailUrl?: string
  streamKey: string
  isLive: boolean
  isPrivate: boolean
  viewerCount: number
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// In-memory store
const streams: Stream[] = []

// Generate random stream key
function generateStreamKey(): string {
  return `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
}

export default async function streamRoutes(fastify: FastifyInstance) {
  
  // GET /api/streams
  fastify.get('/', async (req, reply) => {
    const liveOnly = req.query['live'] === 'true'
    let results = streams
    
    if (liveOnly) {
      results = streams.filter(s => s.isLive)
    }
    
    return reply.send({ success: true, data: results, total: results.length })
  })

  // GET /api/streams/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const stream = streams.find(s => s.id === id)
    
    if (!stream) {
      return reply.status(404).send({ success: false, error: 'Stream not found' })
    }
    
    return reply.send({ success: true, data: stream })
  })

  // POST /api/streams (create stream)
  fastify.post('/', async (req, reply) => {
    const { userId, title, description, category } = req.body as any
    
    const newStream: Stream = {
      id: `stream_${Date.now()}`,
      userId,
      title: title || 'Untitled Stream',
      description,
      category,
      streamKey: generateStreamKey(),
      isLive: false,
      isPrivate: false,
      viewerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    streams.push(newStream)
    return reply.status(201).send({ success: true, data: newStream })
  })

  // PUT /api/streams/:id/go-live
  fastify.put('/:id/go-live', async (req, reply) => {
    const { id } = req.params as any
    const stream = streams.find(s => s.id === id)
    
    if (!stream) {
      return reply.status(404).send({ success: false, error: 'Stream not found' })
    }
    
    stream.isLive = true
    stream.startedAt = new Date()
    stream.viewerCount = 0
    
    return reply.send({ success: true, data: stream })
  })

  // PUT /api/streams/:id/end-stream
  fastify.put('/:id/end-stream', async (req, reply) => {
    const { id } = req.params as any
    const stream = streams.find(s => s.id === id)
    
    if (!stream) {
      return reply.status(404).send({ success: false, error: 'Stream not found' })
    }
    
    stream.isLive = false
    stream.endedAt = new Date()
    stream.viewerCount = 0
    
    return reply.send({ success: true, data: stream })
  })

  // GET /api/streams/:id/chat
  fastify.get('/:id/chat', async (req, reply) => {
    const { id } = req.params as any
    // Return chat messages
    return reply.send({ success: true, data: [], total: 0 })
  })

  // POST /api/streams/:id/chat
  fastify.post('/:id/chat', async (req, reply) => {
    const { id } = req.params as any
    const { userId, content } = req.body as any
    
    // Create chat message
    const message = {
      id: `msg_${Date.now()}`,
      streamId: id,
      userId,
      content,
      isSystem: false,
      createdAt: new Date(),
    }
    
    return reply.status(201).send({ success: true, data: message })
  })
}
