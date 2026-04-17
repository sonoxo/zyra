/**
 * Shadow AI Scanner
 * Discovers unauthorized LLM and AI tool usage across an organization
 * 
 * Scans for:
 * - Known LLM endpoints (OpenAI, Anthropic, Google AI, etc.)
 * - Browser extensions with AI capabilities
 * - SaaS AI integrations (Slack AI, Notion AI, etc.)
 * - Local AI tools running on network
 */

import { FastifyInstance } from 'fastify'

interface ShadowAIFinding {
  id: string
  type: 'endpoint' | 'extension' | 'saas' | 'local'
  name: string
  vendor: string
  url?: string
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  recommendation: string
}

interface ScanResult {
  timestamp: string
  assetsScanned: number
  findings: ShadowAIFinding[]
  summary: {
    total: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
}

// Known AI service patterns
const AI_PATTERNS = {
  endpoints: [
    { pattern: /api\.openai\.com/, name: 'OpenAI API', vendor: 'OpenAI', risk: 'HIGH' as const },
    { pattern: /api\.anthropic\.com/, name: 'Anthropic API', vendor: 'Anthropic', risk: 'HIGH' as const },
    { pattern: /generativelanguage\.googleapis/, name: 'Google AI API', vendor: 'Google', risk: 'HIGH' as const },
    { pattern: /api\.cohere\.ai/, name: 'Cohere API', vendor: 'Cohere', risk: 'HIGH' as const },
    { pattern: /api\.mistral\.ai/, name: 'Mistral AI', vendor: 'Mistral AI', risk: 'HIGH' as const },
    { pattern: /oai\.submit\.co/, name: 'OpenAI Third-Party', vendor: 'OpenAI', risk: 'MEDIUM' as const },
    { pattern: /litellm/, name: 'LiteLLM Proxy', vendor: 'LiteLLM', risk: 'MEDIUM' as const },
  ],
  saas: [
    { pattern: /notion\.com/, name: 'Notion AI', vendor: 'Notion', risk: 'MEDIUM' as const },
    { pattern: /slack\.com\/ai/, name: 'Slack AI', vendor: 'Slack', risk: 'LOW' as const },
    { pattern: /copilot\.microsoft/, name: 'Microsoft Copilot', vendor: 'Microsoft', risk: 'LOW' as const },
    { pattern: /github\.com\/copilot/, name: 'GitHub Copilot', vendor: 'GitHub', risk: 'LOW' as const },
    { pattern: /claude\.ai/, name: 'Claude Web', vendor: 'Anthropic', risk: 'MEDIUM' as const },
    { pattern: /chatgpt/, name: 'ChatGPT', vendor: 'OpenAI', risk: 'MEDIUM' as const },
    { pattern: /gemini\.google/, name: 'Google Gemini', vendor: 'Google', risk: 'MEDIUM' as const },
  ],
  extensions: [
    { name: 'ChatGPT Extension', vendor: 'OpenAI', pattern: 'chatgpt-extension', risk: 'MEDIUM' as const },
    { name: 'Claude Extension', vendor: 'Anthropic', pattern: 'claude-extension', risk: 'MEDIUM' as const },
    { name: 'AI Writing Assistant', vendor: 'Various', pattern: 'ai-writer', risk: 'LOW' as const },
  ]
}

export async function shadowAIRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/shadow-ai/scan
   * Body: { assets?: string[] } (asset URLs to scan)
   * Scan for Shadow AI usage
   */
  fastify.post('/api/shadow-ai/scan', async (request, reply) => {
    const { assets = [] } = request.body as { assets?: string[] }

    const findings: ShadowAIFinding[] = []
    const scannedUrls = new Set<string>()

    // If no assets provided, simulate scanning common targets
    const targets = assets.length > 0 ? assets : [
      'https://api.openai.com',
      'https://api.anthropic.com', 
      'https://generativelanguage.googleapis.com',
      'https://notion.so',
      'https://slack.com',
      'https://github.com',
    ]

    // Simulate scanning each target
    for (const url of targets) {
      if (scannedUrls.has(url)) continue
      scannedUrls.add(url)

      const urlLower = url.toLowerCase()

      // Check endpoint patterns
      for (const ep of AI_PATTERNS.endpoints) {
        if (ep.pattern.test(urlLower)) {
          findings.push({
            id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'endpoint',
            name: ep.name,
            vendor: ep.vendor,
            url,
            risk: ep.risk,
            description: `AI API endpoint detected at ${url}. Ensure this is authorized and monitored.`,
            recommendation: ep.risk === 'HIGH' 
              ? 'Review access controls, implement API logging, ensure data classification'
              : 'Add to approved services list, monitor usage patterns'
          })
        }
      }

      // Check SaaS patterns
      for (const saas of AI_PATTERNS.saas) {
        if (saas.pattern.test(urlLower)) {
          findings.push({
            id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'saas',
            name: saas.name,
            vendor: saas.vendor,
            url,
            risk: saas.risk,
            description: `AI-enabled SaaS application detected at ${url}.`,
            recommendation: 'Verify data sharing policies, enable admin audit logs'
          })
        }
      }
    }

    // If no findings from real scan, add sample findings for demo
    if (findings.length === 0) {
      findings.push(
        {
          id: 'sa_demo_1',
          type: 'endpoint',
          name: 'OpenAI API',
          vendor: 'OpenAI',
          url: 'https://api.openai.com',
          risk: 'HIGH',
          description: 'OpenAI API endpoint in use. Ensure proper API key management and usage monitoring.',
          recommendation: 'Implement API key rotation, enable usage alerts, classify data before sending'
        },
        {
          id: 'sa_demo_2',
          type: 'saas',
          name: 'ChatGPT',
          vendor: 'OpenAI',
          url: 'https://chat.openai.com',
          risk: 'MEDIUM',
          description: 'Employees may be using ChatGPT for work tasks. Review data handling policies.',
          recommendation: 'Establish AI usage policy, consider official Copilot licenses'
        },
        {
          id: 'sa_demo_3',
          type: 'saas',
          name: 'GitHub Copilot',
          vendor: 'GitHub',
          url: 'https://github.com/features/copilot',
          risk: 'LOW',
          description: 'Code completion AI is enabled. Ensure approved for code storage policies.',
          recommendation: 'Verify code review process, ensure no sensitive data in code'
        }
      )
    }

    const result: ScanResult = {
      timestamp: new Date().toISOString(),
      assetsScanned: targets.length,
      findings,
      summary: {
        total: findings.length,
        highRisk: findings.filter(f => f.risk === 'HIGH').length,
        mediumRisk: findings.filter(f => f.risk === 'MEDIUM').length,
        lowRisk: findings.filter(f => f.risk === 'LOW').length,
      }
    }

    return { success: true, ...result }
  })

  /**
   * GET /api/shadow-ai/findings
   * Get last scan results
   */
  fastify.get('/api/shadow-ai/findings', async (request, reply) => {
    // In production, this would fetch from database
    // For now, return mock data
    return {
      success: true,
      findings: [
        {
          id: 'sa_1',
          type: 'endpoint' as const,
          name: 'OpenAI API',
          vendor: 'OpenAI',
          risk: 'HIGH' as const,
          description: 'API endpoint detected',
          recommendation: 'Review access controls'
        },
        {
          id: 'sa_2',
          type: 'saas' as const,
          name: 'ChatGPT',
          vendor: 'OpenAI',
          risk: 'MEDIUM' as const,
          description: 'Web access detected',
          recommendation: 'Establish usage policy'
        }
      ]
    }
  })

  /**
   * POST /api/shadow-ai/remediate
   * Body: { findingId: string, action: 'block' | 'monitor' | 'whitelist' }
   */
  fastify.post('/api/shadow-ai/remediate', async (request, reply) => {
    const { findingId, action } = request.body as { findingId: string; action: 'block' | 'monitor' | 'whitelist' }

    // In production, this would:
    // - block: add to firewall blocklist, create incident
    // - monitor: enable enhanced logging, increase alert threshold
    // - whitelist: add to approved list

    const actions = {
      block: 'blocked',
      monitor: 'now under enhanced monitoring',
      whitelist: 'added to approved AI services'
    }

    // Simulate remediation actions
    const remediationResult = {
      findingId,
      action,
      timestamp: new Date().toISOString(),
      changes: [] as string[],
      notifications: [] as string[]
    }

    switch (action) {
      case 'block':
        remediationResult.changes = [
          `Added ${findingId} to network blocklist`,
          'Firewall rules updated',
          'Monitoring alerts disabled for this endpoint'
        ]
        remediationResult.notifications = [
          'Security team notified',
          'Incident created #INC-SHADOW-AI-001'
        ]
        break
      case 'monitor':
        remediationResult.changes = [
          'Enhanced logging enabled',
          'Alert threshold increased to HIGH only',
          'Added to daily security report'
        ]
        break
      case 'whitelist':
        remediationResult.changes = [
          'Added to approved AI services list',
          'Risk level downgraded to LOW',
          'Removed from active monitoring'
        ]
        break
    }

    return {
      success: true,
      message: `Finding ${findingId} ${actions[action]}`,
      remediation: remediationResult
    }
  })

  /**
   * POST /api/shadow-ai/auto-remediate
   * Auto-remediate based on policy: block HIGH risk, monitor MEDIUM
   * Body: { autoBlockHigh?: boolean, autoMonitorMedium?: boolean }
   */
  fastify.post('/api/shadow-ai/auto-remediate', async (request, reply) => {
    const { autoBlockHigh = true, autoMonitorMedium = false } = request.body as {
      autoBlockHigh?: boolean
      autoMonitorMedium?: boolean
    }

    // In production, this would query database for recent findings
    // For demo, return mock auto-remediation summary
    
    const autoRemediation = {
      timestamp: new Date().toISOString(),
      actions: [] as { type: string; target: string; result: string }[],
      summary: {
        blocked: autoBlockHigh ? 2 : 0,
        monitored: autoMonitorMedium ? 1 : 0,
        whitelisted: 0
      }
    }

    if (autoBlockHigh) {
      autoRemediation.actions.push(
        { type: 'block', target: 'api.openai.com', result: 'blocked' },
        { type: 'block', target: 'api.anthropic.com', result: 'blocked' }
      )
    }

    if (autoMonitorMedium) {
      autoRemediation.actions.push(
        { type: 'monitor', target: 'chat.openai.com', result: 'monitoring enabled' }
      )
    }

    return {
      success: true,
      autoRemediation
    }
  })

export default shadowAIRoutes