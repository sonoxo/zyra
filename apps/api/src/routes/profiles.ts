import type { FastifyInstance } from 'fastify'

interface Profile {
  id: string
  userId: string
  displayName?: string
  bio?: string
  website?: string
  twitter?: string
  instagram?: string
  location?: string
  isPublic: boolean
  followerCount: number
  followingCount: number
  streamCount: number
  createdAt: Date
  updatedAt: Date
}

// In-memory store (replace with Prisma)
const profiles: Profile[] = []

export default async function profileRoutes(fastify: FastifyInstance) {
  
  // GET /api/profiles/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as any
    const profile = profiles.find(p => p.id === id || p.userId === id)
    
    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Profile not found' })
    }
    
    return reply.send({ success: true, data: profile })
  })

  // PUT /api/profiles/:id
  fastify.put('/:id', async (req, reply) => {
    const { id } = req.params as any
    const updates = req.body as Partial<Profile>
    
    const index = profiles.findIndex(p => p.id === id)
    
    if (index > -1) {
      profiles[index] = { ...profiles[index], ...updates, updatedAt: new Date() }
      return reply.send({ success: true, data: profiles[index] })
    }
    
    // Create new profile
    const newProfile: Profile = {
      id: `profile_${Date.now()}`,
      userId: id,
      displayName: updates.displayName,
      bio: updates.bio,
      website: updates.website,
      twitter: updates.twitter,
      instagram: updates.instagram,
      location: updates.location,
      isPublic: true,
      followerCount: 0,
      followingCount: 0,
      streamCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    profiles.push(newProfile)
    return reply.status(201).send({ success: true, data: newProfile })
  })

  // GET /api/profiles/:id/followers
  fastify.get('/:id/followers', async (req, reply) => {
    // Return followers list
    return reply.send({ success: true, data: [], total: 0 })
  })

  // GET /api/profiles/:id/following
  fastify.get('/:id/following', async (req, reply) => {
    // Return following list
    return reply.send({ success: true, data: [], total: 0 })
  })

  // POST /api/profiles/:id/follow
  fastify.post('/:id/follow', async (req, reply) => {
    const { id } = req.params as any
    // Follow logic
    return reply.send({ success: true, message: 'Followed successfully' })
  })

  // DELETE /api/profiles/:id/follow
  fastify.delete('/:id/follow', async (req, reply) => {
    const { id } = req.params as any
    // Unfollow logic
    return reply.send({ success: true, message: 'Unfollowed successfully' })
  })
}
