export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
  
  // Auth
  auth: {
    secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'change-me-in-production',
    url: process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    enterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  },
  
  // AI
  ai: {
    openAIKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4',
  },
  
  // Rate Limits
  rateLimits: {
    scan: {
      free: 10,
      pro: 100,
      enterprise: -1,
    },
    assets: {
      free: 5,
      pro: 50,
      enterprise: -1,
    },
  },
  
  // Security
  security: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || (process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : ['http://localhost:3000']),
    maxRequestSize: '10mb',
  },
  
  // WebSocket / Server
  websocket: {
    port: parseInt(process.env.WS_PORT || process.env.PORT || '3001'),
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
}

export const plans = {
  FREE: {
    name: 'Free',
    limits: { scans: 10, assets: 5, users: 1 },
  },
  PRO: {
    name: 'Pro',
    limits: { scans: 100, assets: 50, users: 10 },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    limits: { scans: -1, assets: -1, users: -1 },
  },
}
