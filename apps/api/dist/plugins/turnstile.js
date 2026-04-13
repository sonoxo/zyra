import fp from 'fastify-plugin';
async function turnstilePlugin(fastify, opts) {
    const { secretKeyEnvVar = 'TURNSTILE_SECRET_KEY', } = opts;
    const TURNSTILE_SECRET = process.env[secretKeyEnvVar] || '';
    fastify.decorate('verifyTurnstile', async (request, reply) => {
        // If no secret configured, skip verification (dev mode)
        if (!TURNSTILE_SECRET) {
            fastify.log.warn('⚠️ No Turnstile secret - CAPTCHA verification disabled');
            return;
        }
        // Only verify on form submissions
        const isFormRoute = request.url.startsWith('/api/auth/register') ||
            request.url.startsWith('/api/auth/login') ||
            request.url.startsWith('/api/password/reset');
        if (!isFormRoute)
            return;
        // Skip for GET requests
        if (request.method === 'GET')
            return;
        // Get Turnstile token from body
        const body = request.body;
        const token = body['cf-turnstile-response'] || body.turnstileToken;
        if (!token) {
            fastify.log.warn('Missing Turnstile token on form submission');
            return reply.status(400).send({
                error: 'CAPTCHA required',
                message: 'Please complete the CAPTCHA challenge'
            });
        }
        // Verify with Cloudflare Turnstile API
        const formData = new URLSearchParams();
        formData.append('secret', TURNSTILE_SECRET);
        formData.append('response', token);
        formData.append('remoteip', request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            request.headers['x-real-ip']?.toString() ||
            request.ip);
        try {
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            const result = await verifyRes.json();
            if (!result.success) {
                fastify.log.warn(`Turnstile verification failed: ${result['error-codes']?.join(', ')}`);
                return reply.status(400).send({
                    error: 'CAPTCHA failed',
                    message: 'CAPTCHA verification failed. Please try again.'
                });
            }
            fastify.log.info('Turnstile verification passed');
        }
        catch (error) {
            fastify.log.error(`Turnstile verification error: ${error}`);
            // Fail open in dev, fail closed in prod? For now fail open
        }
    });
    fastify.addHook('preHandler', async (request, reply) => {
        await fastify.verifyTurnstile(request, reply);
    });
}
export default fp(turnstilePlugin, {
    name: 'turnstile-captcha',
    fastify: '4.x'
});
