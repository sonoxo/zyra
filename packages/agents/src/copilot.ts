import Anthropic from '@anthropic-ai/sdk'
import type { Threat, Incident } from '@zyra/types'

// Initialize Anthropic client (use ANTHROPIC_API_KEY env var)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY,
})

export interface CopilotConfig {
  model?: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514'
  maxTokens?: number
}

export class ZyraCopilot {
  private model: string
  private maxTokens: number

  constructor(config: CopilotConfig = {}) {
    this.model = config.model || 'claude-sonnet-4-20250514'
    this.maxTokens = config.maxTokens || 1024
  }

  /**
   * Analyze a threat and provide detailed insights
   */
  async analyzeThreat(threat: Threat): Promise<string> {
    const prompt = `You are Zyra, an AI-native cybersecurity assistant. Analyze the following security threat and provide:
1. A clear explanation of the risk
2. Potential impact if exploited
3. Recommended immediate actions
4. Long-term mitigation strategy

Threat Details:
- Title: ${threat.title}
- Severity: ${threat.severity}
- Description: ${threat.description}
- Category: ${threat.category}
- Affected Systems: ${threat.affectedSystems?.join(', ') || 'Unknown'}
- Indicators of Compromise: ${threat.indicators?.join(', ') || 'None'}

Provide a concise, actionable response.`

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0].type === 'text' ? response.content[0].text : 'Analysis unavailable'
  }

  /**
   * Prioritize threats based on business context
   */
  async prioritize(threats: Threat[], context?: string): Promise<Threat[]> {
    const threatList = threats.map((t, i) => `${i + 1}. ${t.title} (${t.severity})`).join('\n')
    
    const prompt = `You are Zyra, a cybersecurity prioritization assistant. Rank these threats by actual risk to an organization. Consider:
- Severity
- Exploitability
- Business impact
- Asset criticality

${context ? `Business Context: ${context}\n` : ''}
Threats:
${threatList}

Return ONLY a numbered list of indices (e.g., "1, 3, 2, 4") representing the order of priority (highest first).`

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const indices = text.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => !isNaN(i))
    
    return indices.map(i => threats[i]).filter(Boolean)
  }

  /**
   * Generate remediation steps for a threat
   */
  async suggestFix(threat: Threat): Promise<string[]> {
    const prompt = `You are Zyra, a cybersecurity assistant. Generate 5-7 specific remediation steps for this threat:

Threat: ${threat.title}
Severity: ${threat.severity}
Category: ${threat.category}
Description: ${threat.description}

Return ONLY a JSON array of strings, like: ["Step 1", "Step 2", "Step 3"]
No other text.`

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return JSON.parse(text)
    } catch {
      return [
        'Review the threat details',
        'Implement security patches',
        'Enable enhanced monitoring',
        'Contact security team',
      ]
    }
  }

  /**
   * Analyze an incident and recommend response actions
   */
  async analyzeIncident(incident: Incident): Promise<{
    analysis: string
    recommendedActions: string[]
    severity: 'critical' | 'high' | 'medium' | 'low'
  }> {
    const prompt = `You are Zyra, an AI incident response assistant. Analyze this security incident:

Incident ID: ${incident.id}
Type: ${incident.type}
Severity: ${incident.severity}
Status: ${incident.status}
Description: ${incident.description}
Timeline: ${incident.timeline?.join('\n') || 'N/A'}

Provide:
1. A brief analysis of what happened
2. 3-5 recommended response actions
3. Assign a severity level (critical/high/medium/low)

Format as JSON:
{"analysis": "...", "recommendedActions": ["..."], "severity": "..."}`

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return JSON.parse(text)
    } catch {
      return {
        analysis: 'Analysis pending',
        recommendedActions: ['Investigate incident', 'Contain affected systems', 'Alert security team'],
        severity: incident.severity as any || 'medium',
      }
    }
  }

  /**
   * Generate a security report from multiple threats
   */
  async generateReport(threats: Threat[], title?: string): Promise<string> {
    const threatSummary = threats.map(t => 
      `- ${t.title} [${t.severity}] - ${t.category}`
    ).join('\n')

    const prompt = `You are Zyra, a cybersecurity reporting assistant. Generate a professional executive summary for this security report.

Title: ${title || 'Security Threat Report'}
Date: ${new Date().toISOString().split('T')[0]}

Threats Identified:
${threatSummary}

Generate a report with:
1. Executive Summary (2-3 sentences)
2. Risk Assessment
3. Recommended Actions
4. Next Steps

Use professional tone. This will be read by executives.`

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens * 2,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0].type === 'text' ? response.content[0].text : 'Report generation failed'
  }
}

// Export singleton instance
export const copilot = new ZyraCopilot()