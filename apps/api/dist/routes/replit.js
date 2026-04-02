// Replit integration: receive deploy notifications
export default async function replitRoutes(fastify) {
    // POST /api/replit/deploy - Replit calls this on deploy
    fastify.post('/deploy', async (req, reply) => {
        const { event, deployment } = req.body;
        console.log(`[Replit] Deploy event: ${event}`);
        // Log the deployment
        console.log(`[Replit] Deployment:`, JSON.stringify(deployment));
        // Could trigger alerts, health checks, etc.
        if (event === 'deploy.start') {
            console.log('[Replit] New deployment started');
        }
        else if (event === 'deploy.success') {
            console.log('[Replit] Deployment successful!');
            // Could notify via Discord
        }
        else if (event === 'deploy.failure') {
            console.error('[Replit] Deployment failed!');
        }
        return reply.send({ success: true, event });
    });
    // GET /api/replit/status - check if Replit can reach us
    fastify.get('/status', async (req, reply) => {
        return reply.send({
            success: true,
            status: 'ok',
            service: 'zyra-api',
            timestamp: Date.now()
        });
    });
}
