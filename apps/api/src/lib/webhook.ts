import { prisma } from './prisma.js'
import crypto from 'crypto'

export interface WebhookPayload {
  event: string
  timestamp: string
  data: any
}

export async function triggerWebhook(orgId: string, event: string, data: any) {
  // fetch active webhooks for this org that listen to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      orgId,
      active: true,
    },
  })

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }
  const payloadString = JSON.stringify(payload)

  for (const webhook of webhooks) {
    // check if event in list
    const events = webhook.events.split(',').map((e: string) => e.trim())
    if (!events.includes(event)) continue

    try {
      // prepare request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      // if secret set, sign the payload
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(payloadString)
          .digest('hex')
        headers['X-Zyra-Signature'] = signature
      }

      // send request (fire and forget)
      fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString,
      }).catch(err => {
        console.error(`Webhook delivery failed for ${webhook.url}:`, err)
      })
    } catch (err) {
      console.error('Error triggering webhook', err)
    }
  }
}
