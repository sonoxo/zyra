import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { usersStore, orgsStore } from '../lib/fileStore.js'
import { config } from '@zyra/config'

const JWT_SECRET = process.env.JWT_SECRET || config.auth.secret
const TOKEN_EXPIRY = '7d'

// Build user payload with org info
function buildUserPayload(user: any, orgId?: string, orgRole?: string) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    orgId: orgId || 'default-org',
    orgRole: orgRole || 'VIEWER',
  }
}

interface RegisterBody {
  email: string
  password: string
  name?: string
}

interface LoginBody {
  email: string
  password: string
}

export default async function authRoutes(fastify: FastifyInstance) {
  
  // POST /api/auth/register
  fastify.post<{ Body: RegisterBody }>('/register', async (req, reply) => {
    const { email, password, name } = req.body
    
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password required' })
    }

    if (password.length < 6) {
      return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' })
    }

    try {
      // Check if user exists in file store
      const existing = usersStore.findMany().find(u => u.email === email)
      if (existing) {
        return reply.status(409).send({ success: false, error: 'Email already registered' })
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      
      // Create user in file store
      const user = usersStore.create({
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'VIEWER',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Ensure default org exists
      let org = orgsStore.findMany().find(o => o.slug === 'default')
      if (!org) {
        org = orgsStore.create({
          name: 'Default Organization',
          slug: 'default',
          plan: 'FREE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      const userPayload = buildUserPayload(user, org.id, 'OWNER')
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

      return reply.status(201).send({
        success: true,
        data: { 
          user: userPayload, 
          token 
        }
      })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ success: false, error: 'Registration failed' })
    }
  })

  // POST /api/auth/login
  fastify.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    const { email, password } = req.body
    
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password required' })
    }

    try {
      // Find user in file store
      const user = usersStore.findMany().find(u => u.email === email)
      
      if (!user) {
        return reply.status(401).send({ success: false, error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        return reply.status(401).send({ success: false, error: 'Invalid credentials' })
      }

      const org = orgsStore.findMany()[0]
      const userPayload = buildUserPayload(user, org?.id, 'OWNER')
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

      return reply.send({
        success: true,
        data: { 
          user: userPayload, 
          token 
        }
      })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ success: false, error: 'Login failed' })
    }
  })

  // GET /api/auth/me
  fastify.get('/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return reply.status(401).send({ success: false, error: 'No token provided' })
    }

    const token = authHeader.replace('Bearer ', '')
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      const user = usersStore.findMany().find(u => u.id === decoded.id)
      
      if (!user) {
        return reply.status(401).send({ success: false, error: 'User not found' })
      }

      const org = orgsStore.findMany()[0]
      const userPayload = buildUserPayload(user, org?.id, decoded.orgRole)

      return reply.send({
        success: true,
        data: userPayload
      })
    } catch (error: any) {
      return reply.status(401).send({ success: false, error: 'Invalid token' })
    }
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (req, reply) => {
    // For token-based auth, client just discards token
    return reply.send({ success: true, data: { message: 'Logged out' } })
  })
}