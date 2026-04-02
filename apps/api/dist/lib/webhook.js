import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();
export async function triggerWebhook(orgId, event, data) {
    // fetch active webhooks for this org that listen to this event
    const webhooks = await prisma.webhook.findMany({
        where: {
            orgId,
            active: true,
        },
    });
    const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
    };
    const payloadString = JSON.stringify(payload);
    for (const webhook of webhooks) {
        // check if event in list
        const events = webhook.events.split(',').map(e => e.trim());
        if (!events.includes(event))
            continue;
        try {
            // prepare request
            const headers = {
                'Content-Type': 'application/json',
            };
            // if secret set, sign the payload
            if (webhook.secret) {
                const signature = crypto
                    .createHmac('sha256', webhook.secret)
                    .update(payloadString)
                    .digest('hex');
                headers['X-Zyra-Signature'] = signature;
            }
            // send request (fire and forget)
            fetch(webhook.url, {
                method: 'POST',
                headers,
                body: payloadString,
            }).catch(err => {
                console.error(`Webhook delivery failed for ${webhook.url}:`, err);
            });
        }
        catch (err) {
            console.error('Error triggering webhook', err);
        }
    }
}
