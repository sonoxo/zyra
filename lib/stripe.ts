import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      scans: 10,
      assets: 5,
      users: 1,
    },
  },
  PRO: {
    name: 'Pro',
    price: 99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: {
      scans: 100,
      assets: 50,
      users: 10,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 399,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    limits: {
      scans: -1, // unlimited
      assets: -1,
      users: -1,
    },
  },
}
