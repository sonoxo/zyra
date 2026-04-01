import type { FastifyInstance } from 'fastify'
import type { Server, WebSocket } from 'http'

interface WSClient extends WebSocket {
  orgId?: string
  userId?: string
}

const clients = new Set<WSClient>()

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
    if (client.readyState === WebSocket.OPEN) {
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
    if (client.orgId === orgId && client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}
