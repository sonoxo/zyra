// User & Auth
export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER'

export interface User {
  id: string
  email: string
  name?: string
  role: Role
  orgId?: string
  organization?: Organization
  createdAt: Date
  updatedAt: Date
}

// Organization
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface Organization {
  id: string
  name: string
  slug: string
  stripeCustomerId?: string
  plan: Plan
  createdAt: Date
}

// Assets
export type AssetType = 'WEBSITE' | 'API' | 'SERVER' | 'DATABASE' | 'CONTAINER'
export type AssetStatus = 'ACTIVE' | 'SCANNING' | 'ISOLATED' | 'OFFLINE'

export interface Asset {
  id: string
  name: string
  type: AssetType
  url?: string
  ip?: string
  status: AssetStatus
  orgId: string
  createdAt: Date
  updatedAt: Date
}

// Scans
export type ScanType = 'FULL' | 'QUICK' | 'SPECIFIC'
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface Scan {
  id: string
  type: ScanType
  status: ScanStatus
  score?: number
  orgId: string
  results?: ScanResults
  createdAt: Date
}

export interface ScanResults {
  vulnerabilities: number
  openPorts: number
  sslIssues: number
  complianceIssues: string[]
}

// Threats
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ThreatStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_POSITIVE'

export interface Threat {
  id: string
  severity: Severity
  title: string
  description: string
  cve?: string
  status: ThreatStatus
  assetId: string
  category?: string
  affectedSystems?: string[]
  indicators?: string[]
  createdAt: Date
  resolvedAt?: Date
}

// Incidents
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Incident {
  id: string
  title: string
  description: string
  status: IncidentStatus
  priority: Priority
  type?: string
  severity?: Severity
  timeline?: string[]
  orgId: string
  assignedToId?: string
  createdAt: Date
  updatedAt: Date
}

// AI Agents
export type AgentType = 'PENTEST' | 'THREAT_DETECTION' | 'INCIDENT_RESPONSE' | 'AUTOMATION'

export interface Agent {
  type: AgentType
  name: string
  description: string
  capabilities: string[]
}

// Security Score
export interface SecurityScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: {
    vulnerabilities: number
    threats: number
    compliance: number
    assetHealth: number
  }
  breakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

// WebSocket Events
export type WSEventType = 
  | 'threat:new'
  | 'threat:updated'
  | 'incident:new'
  | 'incident:updated'
  | 'scan:completed'
  | 'score:updated'
  | 'alert:critical'

export interface WSEvent {
  type: WSEventType
  payload: any
  timestamp: number
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
