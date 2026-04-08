// Zyra Notification Types

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertSource = 'microsoft_defender' | 'microsoft_365' | 'crowdstrike' | 'sentinelone' | 'google_workspace' | 'aws' | 'okta' | 'azure_ad';

export interface ZyraAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  source: AlertSource;
  timestamp: Date;
  indicators: string[]; // IPs, hashes, domains
  assets: string[]; // Affected devices/users
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  verdict?: 'true_positive' | 'false_positive' | 'unknown';
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
  components?: any[];
}

export interface NotificationConfig {
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  emailFrom?: string;
  emailRecipients?: string[];
}

export interface NotificationOptions {
  alert: ZyraAlert;
  action?: 'acknowledge' | 'escalate' | 'dismiss' | 'remediate';
  customMessage?: string;
}