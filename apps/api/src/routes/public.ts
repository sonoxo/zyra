import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import crypto from 'crypto'

// Public scan routes for free tier / marketing
export default async function publicRoutes(fastify: FastifyInstance) {
  // POST /api/public/scan - free scan without auth
  fastify.post('/scan', async (req, reply) => {
    const { url, type = 'QUICK' } = req.body as { url?: string; type?: string }
    
    if (!url) {
      return reply.status(400).send({ success: false, error: 'url required' })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return reply.status(400).send({ success: false, error: 'Invalid URL format' })
    }

    try {
      // Create a demo org for public scans if none exists
      let org = await prisma.organization.findFirst({ where: { slug: 'public-scans' } })
      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: 'Public Scans',
            slug: 'public-scans',
            plan: 'FREE',
          },
        })
      }

      // Create asset
      const asset = await prisma.asset.create({
        data: {
          name: url,
          type: 'WEBSITE',
          url,
          orgId: org.id,
        },
      })

      // Create scan
      const scan = await prisma.scan.create({
        data: {
          type,
          status: 'RUNNING',
          orgId: org.id,
          assetId: asset.id,
          startedAt: new Date(),
        },
      })

      // Simulate scan completion
      setTimeout(async () => {
        const score = Math.floor(Math.random() * 30) + 70
        const vulnerabilities = Math.floor(Math.random() * 5)
        
        await prisma.scan.update({
          where: { id: scan.id },
          data: {
            status: 'COMPLETED',
            score,
            completedAt: new Date(),
          },
        })
      }, 3000)

      // Generate shareable report token
      const reportToken = crypto.randomBytes(16).toString('hex')
      
      return reply.status(201).send({
        success: true,
        data: {
          scanId: scan.id,
          reportToken,
          reportUrl: `/api/public/report/${reportToken}`,
          status: 'RUNNING',
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/public/report/:token - get public scan report
  fastify.get('/report/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    
    // Token is used as scan ID for simplicity in this demo
    // In production, use a separate ReportToken table
    const scanId = token
    
    try {
      const scan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: { asset: true },
      })

      if (!scan) {
        return reply.status(404).send({ success: false, error: 'Report not found' })
      }

      // Determine risk level based on score
      let riskLevel = 'LOW'
      if (scan.score && scan.score < 50) riskLevel = 'CRITICAL'
      else if (scan.score && scan.score < 70) riskLevel = 'HIGH'
      else if (scan.score && scan.score < 85) riskLevel = 'MEDIUM'

      // Generate summary
      const summary = {
        score: scan.score || 'N/A',
        riskLevel,
        status: scan.status,
        scannedAt: scan.completedAt || scan.createdAt,
        asset: scan.asset?.name,
        type: scan.type,
        // Mock vulnerability counts
        vulnerabilities: scan.status === 'COMPLETED' ? {
          critical: Math.floor(Math.random() * 2),
          high: Math.floor(Math.random() * 3),
          medium: Math.floor(Math.random() * 5),
          low: Math.floor(Math.random() * 8),
        } : null,
      }

      return reply.send({
        success: true,
        data: {
          reportId: scan.id,
          summary,
          watermarked: true,
          scannedBy: 'Zyra - AI Security Scanner',
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}