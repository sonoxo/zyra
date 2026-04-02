import { describe, it } from 'node:test'
import { strictEqual, ok } from 'node:assert'
// Import types to verify they compile
import type { User, Organization, Asset, Scan, Threat, Incident, Agent, SecurityScore, ApiResponse, PaginatedResponse } from './index.js'

describe('Types', () => {
  it('should have User type defined', () => {
    const user: User = {
      id: '1',
      email: 'test@zyra.dev',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    strictEqual(user.email, 'test@zyra.dev')
    strictEqual(user.role, 'ADMIN')
  })

  it('should have Organization type defined', () => {
    const org: Organization = {
      id: '1',
      name: 'Test Org',
      slug: 'test-org',
      plan: 'PRO',
      createdAt: new Date()
    }
    strictEqual(org.plan, 'PRO')
  })

  it('should have Asset type defined', () => {
    const asset: Asset = {
      id: '1',
      name: 'Test Asset',
      type: 'WEBSITE',
      status: 'ACTIVE',
      orgId: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    strictEqual(asset.type, 'WEBSITE')
    strictEqual(asset.status, 'ACTIVE')
  })

  it('should have Scan type defined', () => {
    const scan: Scan = {
      id: '1',
      type: 'FULL',
      status: 'PENDING',
      orgId: '1',
      createdAt: new Date()
    }
    strictEqual(scan.status, 'PENDING')
    strictEqual(scan.type, 'FULL')
  })

  it('should have Threat type defined', () => {
    const threat: Threat = {
      id: '1',
      severity: 'HIGH',
      title: 'Test Threat',
      description: 'Test description',
      status: 'OPEN',
      assetId: '1',
      createdAt: new Date()
    }
    strictEqual(threat.severity, 'HIGH')
  })

  it('should have Incident type defined', () => {
    const incident: Incident = {
      id: '1',
      title: 'Test Incident',
      description: 'Test',
      status: 'OPEN',
      priority: 'CRITICAL',
      orgId: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    strictEqual(incident.priority, 'CRITICAL')
  })

  it('should have Agent type defined', () => {
    const agent: Agent = {
      type: 'PENTEST',
      name: 'Test Agent',
      description: 'Test',
      capabilities: ['test']
    }
    strictEqual(agent.type, 'PENTEST')
  })

  it('should have SecurityScore type defined', () => {
    const score: SecurityScore = {
      score: 85,
      grade: 'B',
      factors: {
        vulnerabilities: 5,
        threats: 2,
        compliance: 1,
        assetHealth: 10
      },
      breakdown: {
        critical: 1,
        high: 2,
        medium: 5,
        low: 10
      }
    }
    strictEqual(score.grade, 'B')
  })

  it('should have ApiResponse type defined', () => {
    const response: ApiResponse<string> = {
      success: true,
      data: 'test'
    }
    strictEqual(response.success, true)
  })

  it('should have PaginatedResponse type defined', () => {
    const response: PaginatedResponse<string> = {
      items: ['a', 'b'],
      total: 2,
      page: 1,
      pageSize: 10,
      hasMore: false
    }
    strictEqual(response.items.length, 2)
  })
})