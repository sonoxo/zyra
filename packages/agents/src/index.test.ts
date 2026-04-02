import { describe, it } from 'node:test'
import { strictEqual, deepStrictEqual, ok } from 'node:assert'
import { PentestAgent, ThreatDetectionAgent, IncidentResponseAgent, AutomationAgent, AICopilot } from './index.js'

describe('PentestAgent', () => {
  it('should have correct type and name', () => {
    const agent = new PentestAgent()
    strictEqual(agent.type, 'PENTEST')
    strictEqual(agent.name, 'Penetration Testing Agent')
  })

  it('should return scan result structure', async () => {
    const agent = new PentestAgent()
    const result = await agent.runScan('https://example.com')
    ok(result)
    ok(Array.isArray(result.vulnerabilities))
    ok(Array.isArray(result.recommendations))
  })
})

describe('ThreatDetectionAgent', () => {
  it('should have correct type', () => {
    const agent = new ThreatDetectionAgent()
    strictEqual(agent.type, 'THREAT_DETECTION')
  })

  it('should return array of threats', async () => {
    const agent = new ThreatDetectionAgent()
    const result = await agent.analyzeTraffic({})
    ok(Array.isArray(result))
  })
})

describe('IncidentResponseAgent', () => {
  it('should have correct type', () => {
    const agent = new IncidentResponseAgent()
    strictEqual(agent.type, 'INCIDENT_RESPONSE')
  })

  it('should respond to incident without error', async () => {
    const agent = new IncidentResponseAgent()
    const incident = { id: 'inc-1', title: 'Test', description: 'Test', status: 'OPEN', priority: 'HIGH', orgId: 'org-1', createdAt: new Date(), updatedAt: new Date() }
    // Should not throw
    await agent.respond(incident, 'alert')
    ok(true)
  })
})

describe('AutomationAgent', () => {
  it('should have correct type', () => {
    const agent = new AutomationAgent()
    strictEqual(agent.type, 'AUTOMATION')
  })
})

describe('AICopilot', () => {
  it('should explain threat', async () => {
    const copilot = new AICopilot()
    const threat = { id: 't1', severity: 'HIGH', title: 'SQL Injection', description: 'SQL injection vulnerability', status: 'OPEN', assetId: 'a1', createdAt: new Date() }
    const explanation = await copilot.explain(threat)
    ok(explanation.includes('HIGH'))
  })

  it('should prioritize threats by severity', async () => {
    const copilot = new AICopilot()
    const threats = [
      { id: '1', severity: 'LOW', title: 't', description: 'd', status: 'OPEN', assetId: 'a', createdAt: new Date() },
      { id: '2', severity: 'CRITICAL', title: 't', description: 'd', status: 'OPEN', assetId: 'a', createdAt: new Date() },
      { id: '3', severity: 'MEDIUM', title: 't', description: 'd', status: 'OPEN', assetId: 'a', createdAt: new Date() },
    ]
    const sorted = await copilot.prioritize(threats)
    strictEqual(sorted[0].severity, 'CRITICAL')
    strictEqual(sorted[2].severity, 'LOW')
  })

  it('should suggest fix', async () => {
    const copilot = new AICopilot()
    const threat = { id: 't1', severity: 'HIGH', title: 'Open Port', description: 'Port 22 open', status: 'OPEN', assetId: 'a1', createdAt: new Date() }
    const suggestions = await copilot.suggestFix(threat)
    ok(suggestions.length > 0)
  })
})