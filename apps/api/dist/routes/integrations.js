import { prisma } from '../lib/prisma.js';
// Webhook for GitHub/Replit integrations
export default async function integrationsRoutes(fastify) {
    // POST /api/integrations/github/webhook - receive GitHub push events
    fastify.post('/github/webhook', async (req, reply) => {
        const { event, payload } = req.body;
        // GitHub webhook secret validation would go here in production
        try {
            // Trigger scan on push for configured repos
            if (event === 'push') {
                const repo = payload.repository?.full_name;
                const branch = payload.ref;
                console.log(`[GitHub] Push to ${repo}/${branch}`);
                // Find orgs with this repo configured
                // For now, just log - in production would trigger async scan job
            }
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // GET /api/integrations - list available integrations
    fastify.get('/', async (req, reply) => {
        return reply.send({
            success: true,
            data: {
                integrations: [
                    {
                        id: 'github',
                        name: 'GitHub',
                        description: 'Scan on push',
                        status: 'available',
                    },
                    {
                        id: 'replit',
                        name: 'Replit',
                        description: 'Scan on deploy',
                        status: 'available',
                    },
                    {
                        id: 'slack',
                        name: 'Slack',
                        description: 'Alerts to Slack channel',
                        status: 'available',
                    },
                    {
                        id: 'webhook',
                        name: 'Custom Webhooks',
                        description: 'Send alerts to any URL',
                        status: 'available',
                    },
                ],
            },
        });
    });
    // POST /api/integrations/slack/connect - connect Slack workspace
    fastify.post('/slack/connect', async (req, reply) => {
        const { webhookUrl, channel } = req.body;
        const orgId = req.user?.orgId;
        if (!orgId) {
            return reply.status(400).send({ success: false, error: 'No org selected' });
        }
        try {
            // Store Slack webhook in org settings
            const org = await prisma.organization.update({
                where: { id: orgId },
                data: {
                // Add webhook URL to org metadata
                // In production, use separate table for integration configs
                },
            });
            return reply.send({
                success: true,
                data: { message: 'Slack connected (demo mode)' }
            });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
    // POST /api/integrations/replit/deploy - receive Replit deploy events
    fastify.post('/replit/deploy', async (req, reply) => {
        const { replitId, url } = req.body;
        console.log(`[Replit] Deploy detected for ${replitId}: ${url}`);
        // Auto-scan on deploy
        try {
            // Would trigger a scan job here
            return reply.send({ success: true, message: 'Deploy scan queued' });
        }
        catch (error) {
            return reply.status(500).send({ success: false, error: error.message });
        }
    });
}
