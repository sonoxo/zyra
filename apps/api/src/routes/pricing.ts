import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../middleware/auth.js'
import { getPlanPrice, isFeatureIncluded, getPlanLimits, canUpgradePlan } from '../lib/billing.js'

export default async function pricingRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', authMiddleware)

  // GET /api/pricing/plans - get all available plans
  fastify.get('/plans', async (req, reply) => {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
          { name: 'basic_scan', included: true },
          { name: 'limited_reports', included: true },
          { name: 'scans_per_month', limit: 5 },
          { name: 'assets', limit: 10 },
          { name: 'team_members', limit: 3 }
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: getPlanPrice('PRO'),
        interval: 'month',
        features: [
          { name: 'basic_scan', included: true },
          { name: 'advanced_scan', included: true },
          { name: 'unlimited_scans', included: true },
          { name: 'priority_support', included: true },
          { name: 'webhooks', included: true },
          { name: 'scans_per_month', limit: -1 },
          { name: 'assets', limit: 50 },
          { name: 'team_members', limit: 10 }
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: getPlanPrice('ENTERPRISE'),
        interval: 'month',
        features: [
          { name: 'all_pro_features', included: true },
          { name: 'custom_integrations', included: true },
          { name: 'sla', included: true },
          { name: 'dedicated_support', included: true },
          { name: 'scans_per_month', limit: -1 },
          { name: 'assets', limit: -1 },
          { name: 'team_members', limit: -1 }
        ]
      }
    ]

    return reply.send({ success: true, data: plans })
  })

  // GET /api/pricing/limits - get current org limits
  fastify.get('/limits', async (req, reply) => {
    const orgId = req.user?.orgId
    
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    // In production, fetch org from DB and return its plan limits
    const limits = getPlanLimits('FREE') // Default to free
    
    return reply.send({ 
      success: true, 
      data: {
        plan: 'FREE',
        ...limits
      } 
    })
  })

  // POST /api/pricing/upgrade - upgrade plan (stub)
  fastify.post('/upgrade', async (req, reply) => {
    const { plan } = req.body as { plan?: string }
    const orgId = req.user?.orgId
    
    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
      return reply.status(400).send({ success: false, error: 'Invalid plan' })
    }

    // Stub: In production, create Stripe checkout session
    return reply.send({
      success: true,
      data: {
        message: `Upgrade to ${plan} requires payment setup`,
        stripeCheckoutUrl: process.env.STRIPE_SECRET_KEY 
          ? '/api/payments/checkout' 
          : null,
        note: 'Stripe integration requires valid API keys'
      }
    })
  })

  // GET /api/pricing/checkout-session/:priceId - create Stripe checkout (stub)
  fastify.get('/checkout-session/:priceId', async (req, reply) => {
    const { priceId } = req.params as { priceId: string }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ 
        success: false, 
        error: 'Stripe not configured. Please set STRIPE_SECRET_KEY.' 
      })
    }

    // Stub: In production, create actual Stripe checkout session
    return reply.send({
      success: true,
      data: {
        url: `https://checkout.stripe.com/pay/${priceId}`,
        note: 'This is a placeholder - implement actual Stripe checkout'
      }
    })
  })
}