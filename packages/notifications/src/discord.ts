/**
 * Zyra Discord Notification Service
 * Sends SOC alerts to Discord with rich embeds
 * 
 * Usage:
 *   import { DiscordService } from '@zyra/notifications';
 *   const discord = new DiscordService(process.env.DISCORD_WEBHOOK_URL);
 *   await discord.sendAlert(alert);
 */

import axios from 'axios';
import { ZyraAlert, DiscordMessage, DiscordEmbed, AlertSeverity, NotificationOptions } from './types.js';

// Severity color mapping (Discord uses decimal colors)
const SEVERITY_COLORS: Record<AlertSeverity, number> = {
  critical: 16711680,   // Red
  high: 16744448,       // Orange  
  medium: 16776960,     // Yellow
  low: 65280,           // Green
  info: 8449533,        // Blue-gray
};

// Severity emojis
const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
  info: '🔵',
};

// Source display names
const SOURCE_NAMES: Record<string, string> = {
  microsoft_defender: 'Microsoft Defender',
  microsoft_365: 'Microsoft 365',
  crowdstrike: 'CrowdStrike',
  sentinelone: 'SentinelOne',
  google_workspace: 'Google Workspace',
  aws: 'AWS',
  okta: 'Okta',
  azure_ad: 'Azure AD',
};

export class DiscordService {
  private webhookUrl: string;
  private username = 'Zyra Security';
  private avatarUrl = 'https://zyra.host/zyra-logo.png';

  constructor(webhookUrl: string) {
    if (!webhookUrl) {
      throw new Error('Discord webhook URL is required');
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a security alert to Discord
   */
  async sendAlert(alert: ZyraAlert): Promise<boolean> {
    const embed = this.buildAlertEmbed(alert);
    const message: DiscordMessage = {
      username: this.username,
      avatar_url: this.avatarUrl,
      embeds: [embed],
      components: this.buildActionButtons(alert),
    };

    try {
      await axios.post(this.webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      console.log(`[Zyra Discord] Alert ${alert.id} sent successfully`);
      return true;
    } catch (error: any) {
      console.error(`[Zyra Discord] Failed to send alert ${alert.id}:`, error.message);
      return false;
    }
  }

  /**
   * Send a custom message to Discord
   */
  async sendMessage(content: string, embeds?: DiscordEmbed[]): Promise<boolean> {
    const message: DiscordMessage = {
      content,
      username: this.username,
      avatar_url: this.avatarUrl,
      embeds,
    };

    try {
      await axios.post(this.webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return true;
    } catch (error: any) {
      console.error('[Zyra Discord] Failed to send message:', error.message);
      return false;
    }
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats: {
    totalAlerts: number;
    critical: number;
    resolved: number;
    topSources: { source: string; count: number }[];
  }): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '📊 Zyra Daily Security Summary',
      description: `24-hour security overview`,
      color: SEVERITY_COLORS.info,
      fields: [
        { name: 'Total Alerts', value: stats.totalAlerts.toString(), inline: true },
        { name: 'Critical', value: stats.critical.toString(), inline: true },
        { name: 'Resolved', value: stats.resolved.toString(), inline: true },
        { name: 'Top Sources', value: stats.topSources.map(s => `${s.source}: ${s.count}`).join('\n') || 'N/A', inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Zyra Security Platform' },
    };

    return this.sendMessage('🔔 Daily security report', [embed]);
  }

  /**
   * Build alert embed
   */
  private buildAlertEmbed(alert: ZyraAlert): DiscordEmbed {
    const severityEmoji = SEVERITY_EMOJI[alert.severity];
    const color = SEVERITY_COLORS[alert.severity];
    const sourceName = SOURCE_NAMES[alert.source] || alert.source;

    const embed: DiscordEmbed = {
      title: `${severityEmoji} ${alert.title}`,
      description: alert.description,
      color,
      fields: [
        { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
        { name: 'Source', value: sourceName, inline: true },
        { name: 'Status', value: alert.status.toUpperCase(), inline: true },
        { name: 'Alert ID', value: alert.id, inline: true },
        { name: 'Time', value: new Date(alert.timestamp).toLocaleString(), inline: true },
      ],
      timestamp: new Date(alert.timestamp).toISOString(),
      footer: { text: 'Zyra Security Platform' },
    };

    // Add indicators if present
    if (alert.indicators && alert.indicators.length > 0) {
      embed.fields!.push({
        name: 'Indicators',
        value: alert.indicators.slice(0, 5).join('\n') + (alert.indicators.length > 5 ? `\n+${alert.indicators.length - 5} more` : ''),
        inline: false,
      });
    }

    // Add assets if present
    if (alert.assets && alert.assets.length > 0) {
      embed.fields!.push({
        name: 'Affected Assets',
        value: alert.assets.slice(0, 5).join('\n') + (alert.assets.length > 5 ? `\n+${alert.assets.length - 5} more` : ''),
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Build action buttons
   */
  private buildActionButtons(alert: ZyraAlert): any[] {
    return [
      {
        type: 1, // Action row
        components: [
          {
            type: 2, // Button
            style: 3, // Primary (green)
            label: 'Acknowledge',
            custom_id: `ack_${alert.id}`,
            emoji: { name: '✅' },
          },
          {
            type: 2,
            style: 4, // Danger (red)
            label: 'Escalate',
            custom_id: `escalate_${alert.id}`,
            emoji: { name: '⬆️' },
          },
          {
            type: 2,
            style: 2, // Secondary (gray)
            label: 'Dismiss',
            custom_id: `dismiss_${alert.id}`,
            emoji: { name: '❌' },
          },
          {
            type: 2,
            style: 1, // Link button
            label: 'View Details',
            url: `https://zyra.host/dashboard/alerts/${alert.id}`,
          },
        ],
      },
    ];
  }
}

/**
 * Factory function to create Discord service from env
 */
export function createDiscordService(): DiscordService | null {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Zyra Discord] DISCORD_WEBHOOK_URL not set - Discord notifications disabled');
    return null;
  }
  return new DiscordService(webhookUrl);
}

export default DiscordService;