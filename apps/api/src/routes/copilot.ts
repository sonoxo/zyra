import { FastifyInstance } from 'fastify'
import { copilot } from '@zyra/agents'
import type { Threat, Incident } from '@zyra/types'

export async function copilotRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/copilot/analyze-threat
   * Body: { threat: Threat }
   */
  fastify.post('/api/copilot/analyze-threat', async (request, reply) => {
    const { threat } = request.body as { threat: Threat }
    
    if (!threat?.title) {
      return reply.status(400).send({ error: 'Missing threat data' })
    }

    try {
      const analysis = await copilot.analyzeThreat(threat)
      return { success: true, analysis }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/copilot/prioritize
   * Body: { threats: Threat[], context?: string }
   */
  fastify.post('/api/copilot/prioritize', async (request, reply) => {
    const { threats, context } = request.body as { threats: Threat[], context?: string }
    
    if (!threats?.length) {
      return reply.status(400).send({ error: 'Missing threats array' })
    }

    try {
      const prioritized = await copilot.prioritize(threats, context)
      return { success: true, threats: prioritized }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/copilot/suggest-fix
   * Body: { threat: Threat }
   */
  fastify.post('/api/copilot/suggest-fix', async (request, reply) => {
    const { threat } = request.body as { threat: Threat }
    
    if (!threat?.title) {
      return reply.status(400).send({ error: 'Missing threat data' })
    }

    try {
      const steps = await copilot.suggestFix(threat)
      return { success: true, steps }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/copilot/analyze-incident
   * Body: { incident: Incident }
   */
  fastify.post('/api/copilot/analyze-incident', async (request, reply) => {
    const { incident } = request.body as { incident: Incident }
    
    if (!incident?.id) {
      return reply.status(400).send({ error: 'Missing incident data' })
    }

    try {
      const analysis = await copilot.analyzeIncident(incident)
      return { success: true, ...analysis }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/copilot/generate-report
   * Body: { threats: Threat[], title?: string }
   */
  fastify.post('/api/copilot/generate-report', async (request, reply) => {
    const { threats, title } = request.body as { threats: Threat[], title?: string }
    
    if (!threats?.length) {
      return reply.status(400).send({ error: 'Missing threats array' })
    }

    try {
      const report = await copilot.generateReport(threats, title)
      return { success: true, report }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  /**
   * POST /api/copilot/chat
   * Body: { question: string }
   * General Q&A about Zyra, security, and features
   */
  fastify.post('/api/copilot/chat', async (request, reply) => {
    const { question } = request.body as { question: string }
    
    if (!question?.trim()) {
      return reply.status(400).send({ error: 'Missing question' })
    }

    try {
      // Simple knowledge base for common questions
      const knowledge: Record<string, string> = {
        'how do i run a scan': 'Click the "Run Scan" button on the dashboard. Choose Full Scan for comprehensive checks or Quick Scan for critical vulnerabilities.',
        'what is my security score': 'Your security score (0-100) is displayed on the dashboard. Aim for 80+ to maintain strong security posture. Click for detailed breakdowns.',
        'how do i add an asset': 'Go to Dashboard > Assets > Add Asset. Enter the URL, IP, or hostname of the asset you want to monitor.',
        'what does this threat mean': 'Each threat shows severity (CRITICAL/HIGH/MEDIUM/LOW). Click on a threat to see details, affected asset, and recommended fixes.',
        'how do i fix a vulnerability': 'Open the threat details to see remediation steps. Most fixes involve updating software, changing configurations, or applying patches.',
        'what integrations are available': 'Zyra integrates with Slack, Discord, GitHub, cloud providers (AWS, GCP, Azure), and more. Check Settings > Integrations.',
        'how do i invite team members': 'Go to Dashboard > Team > Invite. Enter their email to send an invitation.',
        'what is ai copilot': 'AI Copilot is your security assistant. Ask questions about threats, get remediation advice, or request analysis.',
      }
      
      const lowerQ = question.toLowerCase()
      let answer = ''
      
      // Find matching knowledge base entry
      for (const [key, value] of Object.entries(knowledge)) {
        if (lowerQ.includes(key)) {
          answer = value
          break
        }
      }
      
      // Default fallback
      if (!answer) {
        answer = "I'm Zyra, your AI security assistant. I can help with running scans, understanding threats, adding assets, or answering questions about Zyra's features. What would you like to know?"
      }
      
      return { success: true, answer }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })
}