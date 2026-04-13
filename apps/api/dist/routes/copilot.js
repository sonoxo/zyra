import { copilot } from '@zyra/agents';
export async function copilotRoutes(fastify) {
    /**
     * POST /api/copilot/analyze-threat
     * Body: { threat: Threat }
     */
    fastify.post('/api/copilot/analyze-threat', async (request, reply) => {
        const { threat } = request.body;
        if (!threat?.title) {
            return reply.status(400).send({ error: 'Missing threat data' });
        }
        try {
            const analysis = await copilot.analyzeThreat(threat);
            return { success: true, analysis };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/copilot/prioritize
     * Body: { threats: Threat[], context?: string }
     */
    fastify.post('/api/copilot/prioritize', async (request, reply) => {
        const { threats, context } = request.body;
        if (!threats?.length) {
            return reply.status(400).send({ error: 'Missing threats array' });
        }
        try {
            const prioritized = await copilot.prioritize(threats, context);
            return { success: true, threats: prioritized };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/copilot/suggest-fix
     * Body: { threat: Threat }
     */
    fastify.post('/api/copilot/suggest-fix', async (request, reply) => {
        const { threat } = request.body;
        if (!threat?.title) {
            return reply.status(400).send({ error: 'Missing threat data' });
        }
        try {
            const steps = await copilot.suggestFix(threat);
            return { success: true, steps };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/copilot/analyze-incident
     * Body: { incident: Incident }
     */
    fastify.post('/api/copilot/analyze-incident', async (request, reply) => {
        const { incident } = request.body;
        if (!incident?.id) {
            return reply.status(400).send({ error: 'Missing incident data' });
        }
        try {
            const analysis = await copilot.analyzeIncident(incident);
            return { success: true, ...analysis };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/copilot/generate-report
     * Body: { threats: Threat[], title?: string }
     */
    fastify.post('/api/copilot/generate-report', async (request, reply) => {
        const { threats, title } = request.body;
        if (!threats?.length) {
            return reply.status(400).send({ error: 'Missing threats array' });
        }
        try {
            const report = await copilot.generateReport(threats, title);
            return { success: true, report };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
}
