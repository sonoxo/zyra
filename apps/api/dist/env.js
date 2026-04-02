// Environment validation - runs on API startup
// Production requires: DATABASE_URL, JWT_SECRET, FRONTEND_URL
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'FRONTEND_URL',
];
const recommendedEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'BACKEND_URL',
    'SENTRY_DSN',
    'STRIPE_PRO_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID',
];
function validateEnv() {
    const missing = [];
    const recommended = [];
    for (const env of requiredEnvVars) {
        if (!process.env[env]) {
            missing.push(env);
        }
    }
    for (const env of recommendedEnvVars) {
        if (!process.env[env]) {
            recommended.push(env);
        }
    }
    if (missing.length > 0) {
        console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
        console.error('Set these in Replit Secrets or GitHub Secrets');
        process.exit(1);
    }
    if (recommended.length > 0) {
        console.warn(`⚠️ Missing recommended env vars: ${recommended.join(', ')}`);
    }
    console.log('✅ Environment validated');
    console.log(`🔧 Running in ${process.env.NODE_ENV || 'development'} mode`);
}
// Run validation
validateEnv();
export { validateEnv };
