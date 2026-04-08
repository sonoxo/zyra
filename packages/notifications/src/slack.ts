/**
 * Zyra Slack Notification Service
 * Sends SOC alerts to Slack channels
 */

import axios from 'axios';
import { ZyraAlert, AlertSeverity } from './types.js';

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#FF0000',
  high: '#FF8C00',
  medium: '#FFD700',
  low: '#32CD32',
  info: '#4682B4',
};

export class SlackService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a security alert to Slack
   */
  async sendAlert(alert: ZyraAlert): Promise<boolean> {
    const payload = this.buildSlackPayload(alert);

    try {
      await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      console.log(`[Zyra Slack] Alert ${alert.id} sent successfully`);
      return true;
    } catch (error: any) {
      console.error(`[Zyra Slack] Failed to send alert ${alert.id}:`, error.message);
      return false;
    }
  }

  /**
   * Build Slack message payload
   */
  private buildSlackPayload(alert: ZyraAlert) {
    const color = SEVERITY_COLORS[alert.severity];
    const urgency = alert.severity === 'critical' || alert.severity === 'high' ? '🚨' : '⚠️';

    return {
      username: 'Zyra Security',
      icon_emoji: ':shield:',
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${urgency} Security Alert: ${alert.title}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Severity:*\n${alert.severity.toUpperCase()}` },
                { type: 'mrkdwn', text: `*Source:*\n${alert.source}` },
                { type: 'mrkdwn', text: `*Status:*\n${alert.status}` },
                { type: 'mrkdwn', text: `*Time:*\n${new Date(alert.timestamp).toLocaleString()}` },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Description:*\n${alert.description}`,
              },
            },
          ],
          actions: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View in Dashboard', emoji: true },
              url: `https://zyra.host/dashboard/alerts/${alert.id}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Acknowledge', emoji: true },
              action_id: `ack_${alert.id}`,
            },
          ],
        },
      ],
    };
  }
}

/**
 * Factory function
 */
export function createSlackService(): SlackService | null {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Zyra Slack] SLACK_WEBHOOK_URL not set - Slack notifications disabled');
    return null;
  }
  return new SlackService(webhookUrl);
}

export default SlackService;