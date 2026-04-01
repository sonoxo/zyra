import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'zyra-secret-change-me'

export async function authMiddleware(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return reply.status(401).send({ success: false, error: 'No token provided' })
    }

    const token = authHeader.replace('Bearer ', '')

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = decoded
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid token' })
    }
  })
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: any
  }
}
