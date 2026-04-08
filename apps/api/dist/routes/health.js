import { getSystemHealth } from '@zyra/monitoring';
import { getDbStatus } from '../lib/fileStore.js';
export default async function healthRoutes(fastify) {
    // Simple health check
    fastify.get('/', async (req, reply) => {
        return {
            status: 'ok',
            timestamp: Date.now()
        };
    });
    // Detailed health check with storage status
    fastify.get('/detailed', async (req, reply) => {
        const health = await getSystemHealth();
        const dbStatus = getDbStatus();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
        return {
            success: true,
            data: {
                ...health,
                storage: dbStatus
            }
        };
    });
}
