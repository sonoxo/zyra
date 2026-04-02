import type { FastifyInstance } from 'fastify'
import WebSocket from 'ws'

interface WSClient {
  orgId?: string
  userId?: string
  send(msg: string): void
  readyState: number
  on(event: string, handler: (data: any) => void): void
  close(): void
}

const clients = new Set<WSClient>()

const WS_OPEN = 1

export async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket: WSClient, req) => {
    clients.add(socket)
    console.log('Client connected. Total clients:', clients.size)

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        
        if (message.type === 'auth') {
          socket.orgId = message.orgId
          socket.userId = message.userId
        }
      } catch (e) {
        console.error('Invalid WebSocket message')
      }
    })

    socket.on('close', () => {
      clients.delete(socket)
      console.log('Client disconnected. Total clients:', clients.size)
    })
  })
}

export function broadcast(type: string, payload: any) {
  const event = {
    type,
    payload,
    timestamp: Date.now(),
  }
  
  const message = JSON.stringify(event)
  
  clients.forEach((client) => {
    if (client.readyState === WS_OPEN) {
      client.send(message)
    }
  })
}

export function sendToOrg(orgId: string, type: string, payload: any) {
  const event = {
    type,
    payload,
    timestamp: Date.now(),
  }
  
  const message = JSON.stringify(event)
  
  clients.forEach((client) => {
    if (client.orgId === orgId && client.readyState === WS_OPEN) {
      client.send(message)
    }
  })
}
