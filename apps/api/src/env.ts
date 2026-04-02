// Environment validation - runs on API startup
// Strict validation for production: DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET, FRONTEND_URL required

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'FRONTEND_URL',
]

const recommendedEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'BACKEND_URL',
  'SENTRY_DSN',
]

function validateEnv() {
  const missing: string[] = []
  const recommended: string[] = []

  for (const env of requiredEnvVars) {
    if (!process.env[env]) {
      missing.push(env)
    }
  }

  for (const env of recommendedEnvVars) {
    if (!process.env[env]) {
      recommended.push(env)
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (recommended.length > 0) {
    console.warn(`⚠️ Missing recommended env vars: ${recommended.join(', ')}`)
  }

  console.log('✅ Environment validated')
}

// Run validation
validateEnv()

export { validateEnv }
