import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { config } from '@zyra/config'
import './env.js' // Validate env vars on startup
import { errorMiddleware } from './middleware/error.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { rateLimit } from './middleware/rateLimit.js'

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
import healthRoutes from './routes/health.js'
import { getSystemHealth } from '@zyra/monitoring'
import websocketRoutes from './websocket/index.js'

const server = Fastify({
  logger: true,
})

await server.register(cors, {
  origin: config.security.allowedOrigins,
  credentials: true,
})

// Error handler
await server.register(errorMiddleware)

await server.register(websocket)

// Request ID tracking + rate limiting
requestIdMiddleware(server)
server.addHook('preHandler', rateLimit())

// Health check (simple)
server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }))

// Detailed health route
await server.register(healthRoutes, { prefix: '/api/health' })

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
await server.register(webhookRoutes, { prefix: '/api/webhooks' })
await server.register(jobRoutes, { prefix: '/api/jobs' })

// WebSocket
await server.register(websocketRoutes)

const start = async () => {
  try {
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