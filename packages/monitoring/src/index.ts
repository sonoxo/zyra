import os from 'os'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  cpu: {
    loadavg: number[]
    cores: number
  }
  memory: {
    total: number
    free: number
    used: number
    usagePercent: number
  }
  disk?: {
    total: number
    free: number
    usagePercent: number
  }
  database: {
    status: 'connected' | 'disconnected' | 'error'
    latencyMs?: number
    error?: string
  }
  services?: {
    name: string
    status: 'up' | 'down'
    latencyMs?: number
    error?: string
  }[]
}

/**
 * Get current CPU load averages (1, 5, 15 min)
 */
export function getCpuHealth() {
  const loadavg = os.loadavg()
  const cores = os.cpus().length
  return { loadavg, cores }
}

/**
 * Get memory usage details
 */
export function getMemoryHealth() {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const usagePercent = (used / total) * 100
  return { total, free, used, usagePercent }
}

/**
 * Get disk usage (requires fs usage, placeholder for cross-platform)
 * Note: Not implemented for Windows; returns null
 */
export async function getDiskHealth(): Promise<{ total: number; free: number; usagePercent: number } | null> {
  // Placeholder: implement using fs for actual disk stats
  // For now return null to indicate not available
  return null
}

/**
 * Check database connectivity
 */
export async function getDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error', latencyMs?: number, error?: string }> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start
    return { status: 'connected', latencyMs }
  } catch (error: any) {
    return { status: 'error', error: error.message }
  }
}

/**
 * Perform a full system health check
 */
export async function getSystemHealth(): Promise<HealthStatus> {
  const cpu = getCpuHealth()
  const memory = getMemoryHealth()
  const disk = await getDiskHealth()
  const database = await getDatabaseHealth()
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (database.status === 'error' || memory.usagePercent > 90 || cpu.loadavg[0] > cpu.cores * 0.7) {
    status = 'degraded'
  }
  if (database.status === 'disconnected' || memory.usagePercent > 95) {
    status = 'unhealthy'
  }

  return {
    status,
    timestamp: Date.now(),
    cpu,
    memory,
    disk: disk ?? undefined,
    database,
  }
}
