export async function githubRoutes(fastify) {
    /**
     * GET /api/github/security-alerts
     * Query: owner, repo
     * Header: x-github-token (personal access token)
     *
     * Fetches Dependabot alerts for the specified repository
     */
    fastify.get('/api/github/security-alerts', async (request, reply) => {
        const { owner, repo } = request.query;
        const githubToken = request.headers['x-github-token'];
        if (!owner || !repo) {
            return reply.status(400).send({ error: 'Missing owner or repo' });
        }
        if (!githubToken) {
            return reply.status(401).send({ error: 'Missing GitHub token' });
        }
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dependabot/alerts`, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${githubToken}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            if (!response.ok) {
                const error = await response.text();
                fastify.log.error(`GitHub API error: ${response.status} - ${error}`);
                return reply.status(response.status).send({
                    error: 'GitHub API request failed',
                    details: error,
                });
            }
            const alerts = await response.json();
            // Transform to Zyra format
            const normalizedAlerts = alerts.map((alert) => ({
                id: alert.security_advisory.ghsa_id,
                cve: alert.security_advisory.cve_id,
                title: alert.security_advisory.summary,
                severity: alert.security_advisory.severity.toUpperCase(),
                package: alert.dependency.package.name,
                ecosystem: alert.dependency.package.ecosystem,
                patchedIn: alert.security_vulnerability.first_patched_version?.identifier,
                url: `https://github.com/${owner}/${repo}/security/advisories/${alert.security_advisory.ghsa_id}`,
            }));
            return { success: true, alerts: normalizedAlerts };
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * GET /api/github/code-scanning-alerts
     * Query: owner, repo
     * Header: x-github-token
     *
     * Fetches Code Scanning alerts (if GitHub Advanced Security is enabled)
     */
    fastify.get('/api/github/code-scanning-alerts', async (request, reply) => {
        const { owner, repo } = request.query;
        const githubToken = request.headers['x-github-token'];
        if (!owner || !repo || !githubToken) {
            return reply.status(400).send({ error: 'Missing required parameters' });
        }
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/code-scanning/alerts`, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${githubToken}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            if (!response.ok) {
                // If 404, likely Advanced Security not enabled
                if (response.status === 404) {
                    return { success: true, alerts: [], message: 'No code scanning alerts (Advanced Security may not be enabled)' };
                }
                return reply.status(response.status).send({ error: 'GitHub API error' });
            }
            const alerts = await response.json();
            const normalizedAlerts = alerts.map((alert) => ({
                id: alert.number,
                rule: alert.rule?.name || 'Unknown',
                severity: alert.rule?.security_severity_level?.toUpperCase() || 'UNKNOWN',
                tool: alert.tool?.name || 'Code Scanning',
                description: alert.rule?.description || '',
                url: alert.html_url,
                createdAt: alert.created_at,
            }));
            return { success: true, alerts: normalizedAlerts };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/github/webhook
     * For receiving GitHub webhooks (security events)
     *
     * Verify signature using WEBHOOK_SECRET (already handled)
     */
    fastify.post('/api/github/webhook', async (request, reply) => {
        const event = request.headers['x-github-event-key'];
        const payload = request.body;
        fastify.log.info(`Received GitHub webhook: ${event}`);
        // Process different event types
        switch (event) {
            case 'security_advisory':
                // New vulnerability disclosed
                fastify.log.info('New security advisory', payload);
                // Could create a threat in Zyra here
                break;
            case 'dependabot_alert':
                // New dependabot alert
                fastify.log.info('New dependabot alert', payload);
                break;
            default:
                fastify.log.info(`Unhandled event: ${event}`);
        }
        return { success: true, received: true };
    });
}
