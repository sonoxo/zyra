// Environment validation - runs on API startup
// For production with full features, set DATABASE_URL and JWT_SECRET
const requiredForProduction = [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
];
const recommendedEnvVars = [
    'FRONTEND_URL',
    'BACKEND_URL',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SENTRY_DSN',
    'STRIPE_PRO_PRICE_ID',
    'STRIPE_ENTERPRISE_PRICE_ID',
];
function validateEnv() {
    const missing = [];
    const recommended = [];
    // Check for production requirements
    for (const env of requiredForProduction) {
        if (!process.env[env]) {
            missing.push(env);
        }
    }
    // Check recommended
    for (const env of recommendedEnvVars) {
        if (!process.env[env]) {
            recommended.push(env);
        }
    }
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && missing.length > 0) {
        console.error(`❌ Missing required production env vars: ${missing.join(', ')}`);
        console.error('Set these in your hosting provider secrets');
        process.exit(1);
    }
    if (recommended.length > 0) {
        console.warn(`⚠️ Missing recommended env vars: ${recommended.join(', ')}`);
    }
    if (missing.length > 0) {
        console.warn(`⚠️ Running in limited mode - missing: ${missing.join(', ')}`);
        console.warn(`   Using file-based fallback storage`);
    }
    console.log('✅ Environment validated');
    console.log(`🔧 Running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`💾 Storage: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'File-based (fallback)'}`);
}
// Run validation
validateEnv();
export { validateEnv };
