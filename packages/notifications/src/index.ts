/**
 * Zyra Notifications Package
 * Unified notification service for Discord, Slack, Email, Voice
 * 
 * @example
 * import { DiscordService, SlackService, createNotificationService } from '@zyra/notifications';
 * 
 * const discord = new DiscordService(process.env.DISCORD_WEBHOOK_URL);
 * await discord.sendAlert(alert);
 */

export * from './types.js';
export { DiscordService, createDiscordService } from './discord.js';
export { SlackService, createSlackService } from './slack.js';

/**
 * Main notification service that handles all channels
 */
export class NotificationService {
  private discord: ReturnType<typeof import('./discord.js').createDiscordService>;
  private slack: ReturnType<typeof import('./slack.js').createSlackService>;

  constructor(config: {
    discordUrl?: string;
    slackUrl?: string;
  }) {
    this.discord = config.discordUrl 
      ? new (require('./discord.js').DiscordService)(config.discordUrl)
      : null;
    this.slack = config.slackUrl
      ? new (require('./slack.js').SlackService)(config.slackUrl)
      : null;
  }

  async notifyAll(alert: any): Promise<{ discord?: boolean; slack?: boolean }> {
    const results: { discord?: boolean; slack?: boolean } = {};

    if (this.discord) {
      results.discord = await this.discord.sendAlert(alert);
    }
    if (this.slack) {
      results.slack = await this.slack.sendAlert(alert);
    }

    return results;
  }
}

/**
 * Create notification service from environment variables
 */
export function createNotificationService(): NotificationService | null {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (!discordUrl && !slackUrl) {
    console.warn('[Zyra Notifications] No notification channels configured');
    return null;
  }

  return new NotificationService({
    discordUrl,
    slackUrl,
  });
}