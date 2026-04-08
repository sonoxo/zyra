/**
 * Zyra Notifications - Example Usage
 * 
 * This file shows how to use the Discord and Slack notification services
 */

import { DiscordService, SlackService, createNotificationService, ZyraAlert } from '@zyra/notifications';

// ============================================
// EXAMPLE 1: Discord Notifications
// ============================================

async function discordExample() {
  // Create service with webhook URL
  const discord = new DiscordService(process.env.DISCORD_WEBHOOK_URL!);
  
  // Create a test alert
  const alert: ZyraAlert = {
    id: 'ALT-2026-0408-001',
    title: 'Phishing Email Detected',
    description: 'Suspicious email with malicious attachment detected in user inbox',
    severity: 'high',
    source: 'microsoft_365',
    timestamp: new Date(),
    indicators: ['192.168.1.100', 'malicious-domain.xyz', 'attachment.exe'],
    assets: ['user@company.com', 'WORKSTATION-001'],
    status: 'new',
  };

  // Send alert to Discord
  await discord.sendAlert(alert);
}

// ============================================
// EXAMPLE 2: Slack Notifications  
// ============================================

async function slackExample() {
  const slack = new SlackService(process.env.SLACK_WEBHOOK_URL!);
  
  const alert: ZyraAlert = {
    id: 'ALT-2026-0408-002',
    title: 'Brute Force Attack Detected',
    description: 'Multiple failed login attempts from suspicious IP',
    severity: 'critical',
    source: 'okta',
    timestamp: new Date(),
    indicators: ['185.220.101.45'],
    assets: ['admin@company.com'],
    status: 'investigating',
  };

  await slack.sendAlert(alert);
}

// ============================================
// EXAMPLE 3: Daily Summary
// ============================================

async function dailySummaryExample() {
  const discord = new DiscordService(process.env.DISCORD_WEBHOOK_URL!);
  
  await discord.sendDailySummary({
    totalAlerts: 247,
    critical: 3,
    resolved: 189,
    topSources: [
      { source: 'Microsoft Defender', count: 89 },
      { source: 'Microsoft 365', count: 67 },
      { source: 'CrowdStrike', count: 45 },
    ],
  });
}

// ============================================
// EXAMPLE 4: Auto-notify on Alert Ingest
// ============================================

async function onAlertIngest(alert: ZyraAlert) {
  const notifier = createNotificationService();
  
  if (!notifier) {
    console.log('No notification channels configured');
    return;
  }

  // Send to all configured channels
  const results = await notifier.notifyAll(alert);
  
  console.log('Notification results:', results);
}

// ============================================
// EXAMPLE 5: Environment Setup
// ============================================

/**
 * Required environment variables:
 * 
 * DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
 * SLACK_WEBHOOK_URL=https://hooks.slack.com/...
 */

// To set up Discord webhook:
// 1. Go to Server Settings → Integrations → Webhooks
// 2. Create new webhook, choose channel
// 3. Copy the URL and set as DISCORD_WEBHOOK_URL

// To set up Slack webhook:
// 1. Go to https://api.slack.com/messaging/webhooks
// 2. Create a new app with Incoming Webhooks enabled
// 3. Add webhook to your channel
// 4. Copy the URL and set as SLACK_WEBHOOK_URL