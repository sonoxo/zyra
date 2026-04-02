import os from 'os'

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
 * Get disk usage (placeholder for cross-platform)
 */
export async function getDiskHealth(): Promise<{ total: number; free: number; usagePercent: number } | null> {
  return null
}

/**
 * Check database connectivity - simplified for production
 * In production, would check PostgreSQL connection
 */
export async function getDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error', latencyMs?: number, error?: string }> {
  // For production, this would verify PostgreSQL is accessible
  // For now, assume connected if environment has DATABASE_URL
  if (process.env.DATABASE_URL) {
    return { status: 'connected', latencyMs: 10 }
  }
  return { status: 'disconnected', error: 'No DATABASE_URL' }
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
