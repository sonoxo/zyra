import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { config } from '@zyra/config'

const JWT_SECRET = process.env.JWT_SECRET || config.auth.secret

interface ResetRequestBody {
  email: string
}

interface ResetConfirmBody {
  token: string
  newPassword: string
}

export default async function passwordResetRoutes(fastify: FastifyInstance) {

  // POST /api/password/reset-request - request password reset
  fastify.post<{ Body: ResetRequestBody }>('/reset-request', async (req, reply) => {
    const { email } = req.body

    if (!email) {
      return reply.status(400).send({ success: false, error: 'Email required' })
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      
      if (!user) {
        // Don't reveal if user exists
        return reply.send({ success: true, message: 'If account exists, reset email sent' })
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      })

      // In production, send email here
      // For now, return the reset link (dev mode)
      const resetLink = `${config.auth.url}/auth/reset?token=${token}`
      
      console.log(`🔐 Password Reset Link: ${resetLink}`)

      return reply.send({ 
        success: true, 
        message: 'If account exists, reset email sent',
        devLink: resetLink, // Remove in production
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/password/reset-confirm - confirm password reset
  fastify.post<{ Body: ResetConfirmBody }>('/reset-confirm', async (req, reply) => {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return reply.status(400).send({ success: false, error: 'Token and new password required' })
    }

    if (newPassword.length < 6) {
      return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' })
    }

    try {
      const reset = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true },
      })

      if (!reset) {
        return reply.status(400).send({ success: false, error: 'Invalid token' })
      }

      if (reset.usedAt) {
        return reply.status(400).send({ success: false, error: 'Token already used' })
      }

      if (reset.expiresAt < new Date()) {
        return reply.status(400).send({ success: false, error: 'Token expired' })
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      
      await prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashedPassword },
      })

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      })

      return reply.send({ success: true, message: 'Password updated successfully' })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/password/change - change password (authenticated)
  fastify.post('/change', async (req, reply) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    const userId = req.user?.id

    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Not authenticated' })
    }

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ success: false, error: 'Current and new password required' })
    }

    if (newPassword.length < 6) {
      return reply.status(400).send({ success: false, error: 'Password must be at least 6 characters' })
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' })
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password)
      if (!validPassword) {
        return reply.status(400).send({ success: false, error: 'Current password incorrect' })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12)
      
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      return reply.send({ success: true, message: 'Password changed successfully' })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}