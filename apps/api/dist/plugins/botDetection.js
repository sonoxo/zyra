import fp from 'fastify-plugin';
// In-memory store for failed attempts (use Redis in production)
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
async function botDetectionPlugin(fastify) {
    // Clean up old entries every minute
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of failedAttempts.entries()) {
            if (now - value.firstAttempt > LOCKOUT_WINDOW_MS * 2) {
                failedAttempts.delete(key);
            }
        }
    }, 60000);
    fastify.addHook('onRequest', async (request, reply) => {
        // Only check auth-related endpoints
        const isAuthRoute = request.url.startsWith('/api/auth/login') ||
            request.url.startsWith('/api/auth/register') ||
            request.url.startsWith('/api/password');
        if (!isAuthRoute)
            return;
        const clientIp = request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            request.headers['x-real-ip']?.toString() ||
            request.ip;
        const now = Date.now();
        const attempts = failedAttempts.get(clientIp) || { count: 0, firstAttempt: now, blocked: false };
        // Check if currently locked out
        if (attempts.blocked) {
            const lockoutEnd = attempts.firstAttempt + LOCKOUT_DURATION_MS;
            if (now < lockoutEnd) {
                const remaining = Math.ceil((lockoutEnd - now) / 1000);
                return reply.status(429).send({
                    error: 'Too many requests',
                    message: `Too many failed attempts. Try again in ${remaining} seconds`,
                    retryAfter: remaining
                });
            }
            else {
                // Lockout expired, reset
                attempts.blocked = false;
                attempts.count = 0;
            }
        }
        // Check for suspicious patterns
        const userAgent = request.headers['user-agent'] || '';
        const isSuspicious = !userAgent ||
            userAgent.includes('curl') ||
            userAgent.includes('python') ||
            userAgent.includes('wget');
        if (isSuspicious) {
            fastify.log.info(`Suspicious request from ${clientIp}: ${userAgent}`);
        }
    });
}
// Call this after a failed login attempt
export function recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = failedAttempts.get(ip) || { count: 0, firstAttempt: now, blocked: false };
    attempts.count++;
    attempts.firstAttempt = now;
    // Lock out if too many attempts
    if (attempts.count >= MAX_ATTEMPTS) {
        attempts.blocked = true;
        fastify.log.warn(`IP ${ip} locked out due to too many failed attempts`);
    }
    failedAttempts.set(ip, attempts);
    return attempts.blocked;
}
// Reset after successful login
export function clearFailedAttempts(ip) {
    failedAttempts.delete(ip);
}
export default fp(botDetectionPlugin, {
    name: 'bot-detection',
    fastify: '4.x'
});
let fastify;
function setFastifyInstance(f) {
    fastify = f;
}
const fastifyLogger = {
    warn: (msg) => console.warn(msg),
    info: (msg) => console.info(msg)
};
