import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { config } from '@zyra/config'
import authRoutes from './routes/auth.js'
import assetRoutes from './routes/assets.js'
import scanRoutes from './routes/scan.js'
import threatRoutes from './routes/threats.js'
import incidentRoutes from './routes/incidents.js'
import websocketRoutes from './websocket/index.js'

const server = Fastify({
  logger: true,
})

await server.register(cors, {
  origin: config.security.allowedOrigins,
  credentials: true,
})

await server.register(websocket)

// Health check
server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }))

// API Routes
await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(assetRoutes, { prefix: '/api/assets' })
await server.register(scanRoutes, { prefix: '/api/scan' })
await server.register(threatRoutes, { prefix: '/api/threats' })
await server.register(incidentRoutes, { prefix: '/api/incidents' })

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
