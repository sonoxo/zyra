// Environment validation - runs on API startup
import { config } from './config/index.js'

const requiredEnvVars = ['JWT_SECRET']
const recommendedEnvVars = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'NEXTAUTH_SECRET']

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