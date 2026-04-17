/**
 * API Key Management
 * Programmatic access for MSPs and integrations
 */

import { FastifyInstance } from 'fastify'
import crypto from 'crypto'

interface APIKey {
  id: string
  name: string
  key: string
  prefix: string
  permissions: string[]
  lastUsed?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
}

const API_KEYS: APIKey[] = []

export async function apiKeyRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/keys
   * List all API keys for the current organization
   */
  fastify.get('/api/keys', async (request, reply) => {
    // In production, fetch from database for authenticated org
    const keys = API_KEYS.map(k => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      permissions: k.permissions,
      lastUsed: k.lastUsed,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      isActive: k.isActive
    }))
    return { success: true, keys }
  })

  /**
   * POST /api/keys
   * Create a new API key
   * Body: { name: string, permissions?: string[], expiresInDays?: number }
   */
  fastify.post('/api/keys', async (request, reply) => {
    const { name, permissions = ['read'], expiresInDays } = request.body as {
      name: string
      permissions?: string[]
      expiresInDays?: number
    }

    if (!name) {
      return reply.status(400).send({ error: 'Name is required' })
    }

    const key = crypto.randomBytes(32).toString('hex')
    const prefix = key.substring(0, 8)
    
    const newKey: APIKey = {
      id: `key_${Date.now()}`,
      name,
      key,
      prefix,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      isActive: true
    }

    API_KEYS.push(newKey)

    return {
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        key: newKey.key, // Only returned once!
        prefix: newKey.prefix,
        permissions: newKey.permissions,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt
      }
    }
  })

  /**
   * DELETE /api/keys/:id
   * Revoke an API key
   */
  fastify.delete('/api/keys/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const index = API_KEYS.findIndex(k => k.id === id)
    if (index === -1) {
      return reply.status(404).send({ error: 'Key not found' })
    }

    API_KEYS[index].isActive = false
    
    return { success: true, message: 'API key revoked' }
  })

  /**
   * POST /api/keys/:id/rotate
   * Rotate an API key
   */
  fastify.post('/api/keys/:id/rotate', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const existing = API_KEYS.find(k => k.id === id)
    if (!existing) {
      return reply.status(404).send({ error: 'Key not found' })
    }

    const newKey = crypto.randomBytes(32).toString('hex')
    existing.key = newKey
    existing.prefix = newKey.substring(0, 8)
    existing.createdAt = new Date().toISOString()

    return {
      success: true,
      key: {
        id: existing.id,
        name: existing.name,
        key: existing.key,
        prefix: existing.prefix
      }
    }
  })

  /**
   * GET /api/keys/usage
   * Get API key usage statistics
   */
  fastify.get('/api/keys/usage', async (request, reply) => {
    return {
      success: true,
      usage: {
        totalKeys: API_KEYS.length,
        activeKeys: API_KEYS.filter(k => k.isActive).length,
        requestsThisMonth: Math.floor(Math.random() * 10000),
        topEndpoints: [
          { path: '/api/alerts', requests: 4500 },
          { path: '/api/threats', requests: 3200 },
          { path: '/api/scan', requests: 1800 },
          { path: '/api/shadow-ai', requests: 500 }
        ]
      }
    }
  })
}

export default apiKeyRoutes