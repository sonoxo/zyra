import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

// Simple analytics for tracking MRR, users, conversions
export default async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/analytics/overview - dashboard metrics
  fastify.get('/overview', async (req, reply) => {
    try {
      // Count total users
      const totalUsers = await prisma.user.count()
      
      // Count total organizations
      const totalOrgs = await prisma.organization.count()
      
      // Count total scans
      const totalScans = await prisma.scan.count()
      
      // Count completed scans
      const completedScans = await prisma.scan.count({
        where: { status: 'COMPLETED' },
      })
      
      // Count users with scans
      const usersWithScans = await prisma.scan.groupBy({
        by: ['orgId'],
        _count: true,
      })
      
      // Calculate activation rate (users who did at least 1 scan)
      const activatedUsers = usersWithScans.length
      
      // Get recent signups (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const newUsers = await prisma.user.count({
        where: { createdAt: { gte: weekAgo } },
      })
      
      // Calculate conversion rate (scans with paid org)
      const paidOrgs = await prisma.organization.count({
        where: { 
          plan: { in: ['PRO', 'ENTERPRISE'] },
          stripeCustomerId: { not: null },
        },
      })
      
      const conversionRate = totalScans > 0 
        ? ((paidOrgs / totalOrgs) * 100).toFixed(1) 
        : '0'
      
      // Estimate MRR (assuming all paid orgs are on Pro tier)
      // In production, query Stripe for actual subscription values
      const mrr = paidOrgs * 49 // Pro tier price
      
      return reply.send({
        success: true,
        data: {
          totalUsers,
          totalOrgs,
          totalScans,
          completedScans,
          activatedUsers,
          newUsersLastWeek: newUsers,
          paidOrgs,
          conversionRate: `${conversionRate}%`,
          estimatedMRR: mrr,
          mrrGrowth: 0, // Would track over time
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/analytics/scan-history - scan activity over time
  fastify.get('/scan-history', async (req, reply) => {
    const { days = '7' } = req.query as { days?: string }
    const daysNum = parseInt(days) || 7
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)
    
    try {
      const scans = await prisma.scan.findMany({
        where: { 
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          status: true,
          type: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      
      // Group by day
      const byDay: Record<string, { total: number; completed: number }> = {}
      
      scans.forEach(scan => {
        const day = scan.createdAt.toISOString().split('T')[0]
        if (!byDay[day]) {
          byDay[day] = { total: 0, completed: 0 }
        }
        byDay[day].total++
        if (scan.status === 'COMPLETED') {
          byDay[day].completed++
        }
      })
      
      return reply.send({
        success: true,
        data: Object.entries(byDay).map(([date, counts]) => ({
          date,
          ...counts,
        })),
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // GET /api/analytics/funnel - conversion funnel metrics
  fastify.get('/funnel', async (req, reply) => {
    try {
      // Total signups
      const signups = await prisma.user.count()
      
      // Users with org
      const usersWithOrg = await prisma.organizationUser.count()
      
      // Users with scan
      const usersWithScan = (await prisma.scan.groupBy({
        by: ['orgId'],
      })).length
      
      // Users with paid subscription
      const paidUsers = await prisma.organization.count({
        where: { 
          plan: { in: ['PRO', 'ENTERPRISE'] },
          stripeCustomerId: { not: null },
        },
      })
      
      return reply.send({
        success: true,
        data: {
          signups,
          withOrg: usersWithOrg,
          withScan: usersWithScan,
          converted: paidUsers,
          activationRate: signups > 0 
            ? ((usersWithScan / signups) * 100).toFixed(1) 
            : '0',
          conversionToPaid: usersWithScan > 0 
            ? ((paidUsers / usersWithScan) * 100).toFixed(1) 
            : '0',
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}