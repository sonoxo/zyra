import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { config } from '@zyra/config'
import { prisma } from './lib/prisma.js'
import './env.js' // Validate env vars on startup
import { errorMiddleware } from './middleware/error.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { rateLimit } from './middleware/rateLimit.js'
import { securityHeaders, rateLimitMiddleware } from './middleware/security.js'

// Sentry error monitoring (optional)
import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  })
}
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import jobRoutes from './routes/jobs.js'
import orgRoutes from './routes/orgs.js'
import webhookRoutes from './routes/webhooks.js'
import activityRoutes from './routes/activities.js'
import assetRoutes from './routes/assets.js'
import scanRoutes from './routes/scan.js'
import threatRoutes from './routes/threats.js'
import incidentRoutes from './routes/incidents.js'
import profileRoutes from './routes/profiles.js'

import paymentRoutes from './routes/payments.js'
import stripeRoutes from './routes/stripe.js'
import pricingRoutes from './routes/pricing.js'
import apiKeyRoutes from './routes/keys.js'
import passwordResetRoutes from './routes/password.js'
import notificationRoutes from './routes/notifications.js'
import healthRoutes from './routes/health.js'
import copilotRoutes from './routes/copilot.js'
import publicRoutes from './routes/public.js'
import analyticsRoutes from './routes/analytics.js'
import integrationsRoutes from './routes/integrations.js'
import auditRoutes from './routes/audit.js'
import githubRoutes from './routes/github.js'
import blockchainRoutes from './routes/blockchain.js'
import bootstrapRoutes from './routes/bootstrap.js'
import replitRoutes from './routes/replit.js'
import ipAllowlistPlugin from './plugins/ipAllowlist.js'
import ssrfProtectionPlugin from './plugins/ssrfProtection.js'
import botDetectionPlugin from './plugins/botDetection.js'
import webhookSignaturePlugin from './plugins/webhookSignature.js'
import turnstilePlugin from './plugins/turnstile.js'
import { getSystemHealth } from '@zyra/monitoring'
import { websocketRoutes } from './websocket/index.js'

const server = Fastify({
  logger: true,
})

await server.register(cors, {
  origin: config.security.allowedOrigins,
  credentials: true,
})

// Security headers
securityHeaders(server)

// Rate limiting (custom in-memory)
rateLimitMiddleware(server)

// Error handler
errorMiddleware(server)

await server.register(websocket)

// Request ID tracking + rate limiting
requestIdMiddleware(server)
server.addHook('preHandler', rateLimit())

// Security plugins
await server.register(ssrfProtectionPlugin) // Block SSRF attacks
await server.register(ipAllowlistPlugin)     // Restrict admin IP access
await server.register(botDetectionPlugin)    // Detect bot attacks on auth
await server.register(webhookSignaturePlugin, { secretEnvVar: 'WEBHOOK_SECRET' }) // Verify webhook signatures
await server.register(turnstilePlugin, { secretKeyEnvVar: 'TURNSTILE_SECRET_KEY' }) // CAPTCHA on auth forms

// Health check (simple)
server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }))
server.get('/api/health', async () => ({ success: true, status: 'ok', timestamp: new Date().toISOString() }))

// Detailed health route
await server.register(healthRoutes, { prefix: '/api/health' })
await server.register(publicRoutes, { prefix: '/api/public' })
await server.register(analyticsRoutes, { prefix: '/api/analytics' })
await server.register(integrationsRoutes, { prefix: '/api/integrations' })
await server.register(auditRoutes, { prefix: '/api/audit' })
await server.register(githubRoutes, { prefix: '/api/github' })
await server.register(blockchainRoutes, { prefix: '/api/blockchain' })
await server.register(bootstrapRoutes, { prefix: '/api/bootstrap' })
await server.register(replitRoutes, { prefix: '/api/replit' })

// API Routes
await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(userRoutes, { prefix: '/api/users' })
await server.register(orgRoutes, { prefix: '/api/orgs' })
await server.register(activityRoutes, { prefix: '/api/activities' })
await server.register(assetRoutes, { prefix: '/api/assets' })
await server.register(scanRoutes, { prefix: '/api/scan' })
await server.register(threatRoutes, { prefix: '/api/threats' })
await server.register(incidentRoutes, { prefix: '/api/incidents' })
await server.register(profileRoutes, { prefix: '/api/profiles' })

await server.register(paymentRoutes, { prefix: '/api/payments' })
await server.register(stripeRoutes, { prefix: '/api/stripe' })
await server.register(pricingRoutes, { prefix: '/api/pricing' })
await server.register(apiKeyRoutes, { prefix: '/api/keys' })
await server.register(passwordResetRoutes, { prefix: '/api/password' })
await server.register(notificationRoutes, { prefix: '/api/notifications' })
await server.register(copilotRoutes, { prefix: '/api/copilot' })
await server.register(webhookRoutes, { prefix: '/api/webhooks' })
await server.register(jobRoutes, { prefix: '/api/jobs' })

// WebSocket
await server.register(websocketRoutes)

// Auto-bootstrap: create admin user if none exists
async function autoBootstrap() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminEmail || !adminPassword) {
    console.log('[Bootstrap] No ADMIN_EMAIL/PASSWORD set, skipping auto-bootstrap')
    return
  }
  
  try {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      console.log('[Bootstrap] Users already exist, skipping')
      return
    }
    
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
        isVerified: true,
      },
    })
    
    // Create default org
    const org = await prisma.organization.create({
      data: { name: 'Zyra HQ', slug: 'zyra-hq', plan: 'ENTERPRISE' },
    })
    
    await prisma.organizationUser.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER' },
    })
    
    await prisma.profile.create({
      data: { userId: user.id, displayName: 'Admin' },
    })
    
    console.log(`[Bootstrap] Created admin user: ${adminEmail}`)
  } catch (error: any) {
    console.error('[Bootstrap] Failed:', error.message)
  }
}

const start = async () => {
  try {
    // Run auto-bootstrap before accepting requests
    await autoBootstrap()
    
    await server.listen({ port: config.websocket.port, host: '0.0.0.0' })
    console.log(`🚀 Zyra API running on port ${config.websocket.port}`)
    
    // Start continuous health monitoring (every 5 minutes)
    const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
    setInterval(async () => {
      const health = await getSystemHealth()
      if (health.status === 'unhealthy') {
        console.error('[Health Monitor] UNHEALTHY:', JSON.stringify(health))
        // TODO: send alert to Discord/Slack/Email
      } else if (health.status === 'degraded') {
        console.warn('[Health Monitor] DEGRADED:', JSON.stringify(health))
      } else {
        console.log('[Health Monitor] Healthy:', health.status)
      }
    }, HEALTH_CHECK_INTERVAL)
    
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()