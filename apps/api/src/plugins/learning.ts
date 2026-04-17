/**
 * Learning & Analytics Plugin
 * Tracks user questions, identifies gaps, generates insights
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as fs from 'fs'
import * as path from 'path'

interface QuestionLogEntry {
  question: string
  timestamp: Date
  answered: boolean
  action?: string
}

interface PopularQuestion {
  question: string
  count: number
  lastAsked: Date
}

// Simple file-based store
const LEARNING_FILE = path.join(process.cwd(), 'data', 'learning.json')

function loadLearningData(): { questions: QuestionLogEntry[]; popular: PopularQuestion[] } {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load learning data:', e)
  }
  return { questions: [], popular: [] }
}

function saveLearningData(data: { questions: QuestionLogEntry[]; popular: PopularQuestion[] }) {
  try {
    const dir = path.dirname(LEARNING_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Failed to save learning data:', e)
  }
}

export async function learningRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/learning/log-question
   * Body: { question: string; answered?: boolean; action?: string }
   * Log a user question for learning
   */
  fastify.post('/api/learning/log-question', async (request, reply) => {
    const { question, answered = true, action } = request.body as {
      question: string
      answered?: boolean
      action?: string
    }

    if (!question?.trim()) {
      return reply.status(400).send({ error: 'Missing question' })
    }

    const data = loadLearningData()

    // Add to questions log
    data.questions.push({
      question: question.trim(),
      timestamp: new Date(),
      answered,
      action
    })

    // Keep only last 1000 questions
    if (data.questions.length > 1000) {
      data.questions = data.questions.slice(-1000)
    }

    // Update popular questions
    const normalized = question.toLowerCase().trim()
    const existing = data.popular.find(p => p.question === normalized)
    if (existing) {
      existing.count += 1
      existing.lastAsked = new Date()
    } else {
      data.popular.push({
        question: normalized,
        count: 1,
        lastAsked: new Date()
      })
    }

    // Sort by count descending, keep top 20
    data.popular.sort((a, b) => b.count - a.count)
    data.popular = data.popular.slice(0, 20)

    saveLearningData(data)

    return { success: true }
  })

  /**
   * GET /api/learning/popular
   * Get most frequently asked questions
   */
  fastify.get('/api/learning/popular', async (request, reply) => {
    const data = loadLearningData()
    return { success: true, popular: data.popular }
  })

  /**
   * GET /api/learning/insights
   * Get analytics insights: common topics, undocumented gaps
   */
  fastify.get('/api/learning/insights', async (request, reply) => {
    const data = loadLearningData()
    
    // Simple topic analysis
    const topics: Record<string, number> = {
      'scan': 0,
      'threat': 0,
      'asset': 0,
      'report': 0,
      'score': 0,
      'team': 0,
      'integration': 0,
      'vulnerability': 0,
      'fix': 0,
    }

    for (const q of data.questions) {
      const lower = q.question.toLowerCase()
      for (const topic of Object.keys(topics)) {
        if (lower.includes(topic)) {
          topics[topic]++
        }
      }
    }

    // Identify potential documentation gaps (unanswered questions)
    const gaps = data.questions
      .filter(q => !q.answered)
      .slice(-10)
      .map(q => q.question)

    return {
      success: true,
      insights: {
        topics,
        totalQuestions: data.questions.length,
        popularCount: data.popular.length,
        documentationGaps: gaps
      }
    }
  })

  /**
   * GET /api/learning/auto-guide
   * Generate a guide based on popular questions
   */
  fastify.get('/api/learning/auto-guide', async (request, reply) => {
    const data = loadLearningData()
    
    // Generate simple guide from top questions
    const guideSections: { title: string; content: string }[] = []

    // Group by topic
    const topicGuides: Record<string, string> = {
      'scan': '## Running Scans\n\nTo run a scan, click the "Run Scan" button on the dashboard. Choose Full Scan for comprehensive checks or Quick Scan for critical vulnerabilities.',
      'threat': '## Understanding Threats\n\nThreats are categorized by severity: CRITICAL (immediate action needed), HIGH (urgent), MEDIUM (soon), LOW (plan to fix). Click a threat for details and remediation steps.',
      'asset': '## Managing Assets\n\nAdd assets on Dashboard > Assets > Add Asset. Enter URL, IP, or hostname. Assets are automatically monitored for vulnerabilities.',
      'report': '## Generating Reports\n\nGo to Dashboard > Reports > Generate. Choose PDF or JSON format. Reports include vulnerability summaries, compliance status, and remediation recommendations.',
      'score': '## Security Score\n\nYour score (0-100) reflects overall security posture. Aim for 80+. Click the score card for category breakdowns.',
    }

    for (const [topic, content] of Object.entries(topicGuides)) {
      if (topics[topic] > 0) {
        guideSections.push({ title: topic.charAt(0).toUpperCase() + topic.slice(1), content })
      }
    }

    // Default sections if no data
    if (guideSections.length === 0) {
      guideSections.push(
        { title: 'Getting Started', content: 'Welcome to Zyra! Start by adding your first asset, then run a scan to see your security posture.' },
        { title: 'Running Scans', content: 'Click "Run Scan" on the dashboard. Full scans check everything; Quick scans focus on critical issues.' },
        { title: 'Understanding Results', content: 'View threats on the Dashboard > Threats tab. Each threat shows severity and recommended fixes.' }
      )
    }

    return {
      success: true,
      guide: {
        title: 'Your Personalized Security Guide',
        generatedAt: new Date().toISOString(),
        sections: guideSections
      }
    }
  })
}

export default learningRoutes