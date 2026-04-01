import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { RouteOptions } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '@zyra/config'

interface LoginBody {
  email: string
  password: string
}

interface RegisterBody {
  email: string
  password: string
  name: string
  organizationName: string
}

const authRoutes: RouteOptions = {
  method: 'POST',
  url: '/login',
  handler: async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const { email, password } = req.body
    
    // In production: validate against database
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Missing credentials' })
    }
    
    // Mock user for demo - replace with real DB lookup
    const token = jwt.sign(
      { email, role: 'ADMIN', orgId: 'org_1' },
      config.auth.secret,
      { expiresIn: '7d' }
    )
    
    reply.send({
      success: true,
      data: { token, user: { email, role: 'ADMIN', orgId: 'org_1' } },
    })
  },
}

export default async function (fastify: FastifyInstance) {
  fastify.post('/login', authRoutes.handler)
  
  fastify.post('/register', async (req: FastifyRequest<{ Body: RegisterBody }>, reply) => {
    const { email, password, name, organizationName } = req.body
    
    // In production: create user in database
    reply.send({
      success: true,
      message: 'Registration successful',
    })
  })
}

export { authRoutes }
