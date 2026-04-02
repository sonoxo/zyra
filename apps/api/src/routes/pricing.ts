import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { config } from '@zyra/config'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
})

// Plan definitions
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      scans: 10,
      assets: 5,
      users: 1,
      prioritySupport: false,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    features: {
      scans: 100,
      assets: 50,
      users: 10,
      prioritySupport: true,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
    features: {
      scans: -1, // unlimited
      assets: -1,
      users: -1,
      prioritySupport: true,
    },
  },
}

export default async function pricingRoutes(fastify: FastifyInstance) {
  await fastify.addHook('onRequest', async (req, reply) => {
    await authMiddleware(req, reply)
  })

  // GET /api/pricing/plans - list available plans
  fastify.get('/plans', async (req, reply) => {
    return reply.send({
      success: true,
      data: Object.values(PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        features: plan.features,
      })),
    })
  })

  // GET /api/pricing/my-plan - get current user's plan
  fastify.get('/my-plan', async (req, reply) => {
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      })

      const currentPlan = PLANS[org?.plan as keyof typeof PLANS] || PLANS.FREE

      return reply.send({
        success: true,
        data: {
          plan: currentPlan.id,
          name: currentPlan.name,
          price: currentPlan.price,
          features: currentPlan.features,
        },
      })
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message })
    }
  })

  // POST /api/pricing/checkout - create Stripe checkout session
  fastify.post('/checkout', async (req, reply) => {
    const { planId } = req.body as { planId: string }
    const orgId = req.user?.orgId

    if (!orgId) {
      return reply.status(400).send({ success: false, error: 'No organization selected' })
    }

    const plan = PLANS[planId as keyof typeof PLANS]
    if (!plan || !plan.priceId) {
      return reply.status(400).send({ success: false, error: 'Invalid plan' })
    }

    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } })
      
      let customerId = org?.stripeCustomerId

      // Create Stripe customer if needed
      if (!customerId && config.stripe.secretKey) {
        const customer = await stripe.customers.create({
          email: req.user?.email,
          metadata: { orgId },
        })
        customerId = customer.id

        await prisma.organization.update({
          where: { id: orgId },
          data: { stripeCustomerId: customerId },
        })
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${config.auth.url}/dashboard?upgrade=success`,
        cancel_url: `${config.auth.url}/dashboard?upgrade=cancelled`,
        metadata: { orgId, planId },
      })

      return reply.send({
        success: true,
        data: { sessionId: session.id, url: session.url },
      })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ success: false, error: 'Failed to create checkout session' })
    }
  })

  // POST /api/pricing/webhook - handle Stripe webhooks
  fastify.post('/webhook', async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string

    if (!config.stripe.webhookSecret) {
      return reply.status(400).send({ success: false, error: 'Webhook not configured' })
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body as any,
        sig,
        config.stripe.webhookSecret
      )

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any
          const { orgId, planId } = session.metadata

          if (orgId && planId) {
            await prisma.organization.update({
              where: { id: orgId },
              data: { plan: planId.toUpperCase() },
            })
          }
          break
        }

        case 'customer.subscription.deleted': {
          // Downgrade to free
          const subscription = event.data.object as any
          const org = await prisma.organization.findFirst({
            where: { stripeCustomerId: subscription.customer },
          })
          if (org) {
            await prisma.organization.update({
              where: { id: org.id },
              data: { plan: 'FREE' },
            })
          }
          break
        }
      }

      return reply.send({ success: true })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(400).send({ success: false, error: 'Webhook error' })
    }
  })
}