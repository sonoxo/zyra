import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'zyra-secret-change-me'
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

    // Check if user exists (skip for demo)
    // const existing = await prisma.user.findUnique({ where: { email } })
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = {
      id: `user_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      role: 'VIEWER',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    )

    // Create session
    const session = {
      id: `session_${Date.now()}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }

    return reply.status(201).send({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token }
    })
  })

  // POST /api/auth/login
  fastify.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    const { email, password } = req.body
    
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password required' })
    }

    // Demo user (replace with real DB lookup)
    if (email !== 'demo@zyra.io') {
      const token = jwt.sign(
        { id: 'demo_user', email, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      )

      return reply.send({
        success: true,
        data: { user: { id: 'demo_user', email, name: 'Demo User', role: 'ADMIN' }, token }
      })
    }

    return reply.status(401).send({ success: false, error: 'Invalid credentials' })
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
      return reply.send({ success: true, data: { user: decoded } })
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid token' })
    }
  })
}
