import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { config } from '@zyra/config'

const JWT_SECRET = process.env.JWT_SECRET || config.auth.secret
const TOKEN_EXPIRY = '7d'

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
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.status(409).send({ success: false, error: 'Email already registered' })
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
          role: 'VIEWER',
          isVerified: false,
        },
      })

      // Create profile
      await prisma.profile.create({
        data: {
          userId: user.id,
          displayName: name || email.split('@')[0],
        },
      })

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      )

      return reply.status(201).send({
        success: true,
        data: { 
          user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
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
      const user = await prisma.user.findUnique({ where: { email } })
      
      if (!user) {
        return reply.status(401).send({ success: false, error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if (!validPassword) {
        return reply.status(401).send({ success: false, error: 'Invalid credentials' })
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      )

      return reply.send({
        success: true,
        data: { 
          user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
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
      
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.id },
        include: { profile: true }
      })
      
      if (!user) {
        return reply.status(401).send({ success: false, error: 'User not found' })
      }

      return reply.send({ 
        success: true, 
        data: { 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            avatar: user.avatar,
            isVerified: user.isVerified,
          },
          profile: user.profile
        } 
      })
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid token' })
    }
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    // For now, just return success - JWT is stateless
    return reply.send({ success: true, message: 'Logged out' })
  })
}