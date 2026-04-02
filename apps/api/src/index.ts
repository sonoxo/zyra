import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { config } from '@zyra/config'
import './env.js' // Validate env vars on startup
import { errorMiddleware } from './middleware/error.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import orgRoutes from './routes/orgs.js'
import activityRoutes from './routes/activities.js'
import assetRoutes from './routes/assets.js'
import scanRoutes from './routes/scan.js'
import threatRoutes from './routes/threats.js'
import incidentRoutes from './routes/incidents.js'
import profileRoutes from './routes/profiles.js'
import streamRoutes from './routes/streams.js'
import paymentRoutes from './routes/payments.js'
import stripeRoutes from './routes/stripe.js'
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

// Health check
server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }))

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
await server.register(streamRoutes, { prefix: '/api/streams' })
await server.register(paymentRoutes, { prefix: '/api/payments' })
await server.register(stripeRoutes, { prefix: '/api/stripe' })

// WebSocket
await server.register(websocketRoutes)

const start = async () => {
  try {
    await server.listen({ port: config.websocket.port, host: '0.0.0.0' })
    console.log(`🚀 Zyra API running on port ${config.websocket.port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()