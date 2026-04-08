// In-memory scan storage for when DB is unavailable
import crypto from 'crypto'

export interface ScanResult {
  id: string
  targetUrl: string
  type: string
  status: string
  score: number
  riskLevel: string
  summary: string
  findings: Array<{ severity: string; title: string; description: string; cve?: string }>
  completedAt: string
}

// Simple in-memory store with max 1000 entries
const scanStore = new Map<string, ScanResult>()
const MAX_ENTRIES = 1000

export function storeScan(scan: ScanResult): void {
  // Cleanup old entries if at max
  if (scanStore.size >= MAX_ENTRIES) {
    const oldestKey = scanStore.keys().next().value
    if (oldestKey) scanStore.delete(oldestKey)
  }
  scanStore.set(scan.id, scan)
}

export function getScan(id: string): ScanResult | undefined {
  return scanStore.get(id)
}

export function generateScanId(): string {
  return crypto.randomBytes(8).toString('hex')
}