/**
 * Zyra Nango Integration Service
 * Connects to data sources: M365, Defender, Okta, AWS, CrowdStrike, etc.
 * 
 * Uses Nango for unified API integrations
 */

import axios from 'axios';
import { z } from 'zod';

// ============================================
// Types
// ============================================

export type IntegrationProvider = 
  | 'microsoft_365'
  | 'microsoft_defender'
  | 'google_workspace'
  | 'crowdstrike'
  | 'sentinelone'
  | 'okta'
  | 'azure_ad'
  | 'aws';

export interface IntegrationConfig {
  provider: IntegrationProvider;
  connectionId: string;
  nangoUrl?: string;
  nangoSecretKey?: string;
}

// Alert schemas from different sources
export const DefenderAlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.string(),
  category: z.string(),
  detectionTime: z.string(),
  machineName: z.string(),
  ipAddress: z.string().optional(),
  fileName: z.string().optional(),
  status: z.string().optional(),
});

export const M365AlertSchema = z.object({
  AlertId: z.string(),
  AlertName: z.string(),
  Severity: z.string(),
  Category: z.string(),
  DateTimeCreated: z.string(),
  UserId: z.string().optional(),
  MailboxPrimaryOwnerEmail: z.string().optional(),
  Subject: z.string().optional(),
  Status: z.string().optional(),
});

export const OktaAlertSchema = z.object({
  uuid: z.string(),
  message: z.string(),
  published: z.string(),
  version: z.string().string(),
  severity: z.string(),
  displayMessage: z.string().optional(),
  actor: z.object({
    id: z.string(),
    type: z.string(),
    alternateId: z.string().optional(),
  }).optional(),
  target: z.array(z.object({
    id: z.string(),
    type: z.string(),
    alternateId: z.string().optional(),
  })).optional(),
});

// Generic alert format for Zyra
export interface ZyraNormalizedAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  source: IntegrationProvider;
  timestamp: Date;
  indicators: {
    ips?: string[];
    hashes?: string[];
    domains?: string[];
    files?: string[];
  };
  assets: {
    users?: string[];
    devices?: string[];
    emails?: string[];
  };
  rawData: any;
}

// ============================================
// Nango Service
// ============================================

export class NangoService {
  private baseUrl: string;
  private secretKey: string;

  constructor(config: { nangoUrl?: string; nangoSecretKey: string }) {
    this.baseUrl = config.nangoUrl || process.env.NANGO_URL || 'https://api.nango.dev';
    this.secretKey = config.nangoSecretKey || process.env.NANGO_SECRET_KEY || '';
    
    if (!this.secretKey) {
      throw new Error('Nango secret key is required');
    }
  }

  /**
   * Get connection status for an integration
   */
  async getConnection(connectionId: string, provider: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/connections/${connectionId}?provider=${provider}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`[Nango] Failed to get connection:`, error.message);
      throw error;
    }
  }

  /**
   * Trigger a sync for a specific integration
   */
  async triggerSync(connectionId: string, provider: string, syncName: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/connections/${connectionId}/trigger`,
        { provider, sync_name: syncName },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`[Nango] Failed to trigger sync:`, error.message);
      throw error;
    }
  }

  /**
   * Get recent records from a sync
   */
  async getRecords(connectionId: string, provider: string, model: string, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/records?connection_id=${connectionId}&provider=${provider}&model=${model}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`[Nango] Failed to get records:`, error.message);
      throw error;
    }
  }
}

// ============================================
// Alert Normalizers
// ============================================

/**
 * Normalize Microsoft Defender alerts
 */
export function normalizeDefenderAlert(alert: any): ZyraNormalizedAlert {
  const severityMap: Record<string, ZyraNormalizedAlert['severity']> = {
    'Critical': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    'Informational': 'info',
  };

  return {
    id: `defender-${alert.id}`,
    title: alert.title,
    description: `${alert.category} - ${alert.title}`,
    severity: severityMap[alert.severity] || 'medium',
    source: 'microsoft_defender',
    timestamp: new Date(alert.detectionTime),
    indicators: {
      ips: alert.ipAddress ? [alert.ipAddress] : [],
      files: alert.fileName ? [alert.fileName] : [],
    },
    assets: {
      devices: alert.machineName ? [alert.machineName] : [],
    },
    rawData: alert,
  };
}

/**
 * Normalize Microsoft 365 alerts
 */
export function normalizeM365Alert(alert: any): ZyraNormalizedAlert {
  const severityMap: Record<string, ZyraNormalizedAlert['severity']> = {
    'Critical': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    'Informational': 'info',
  };

  return {
    id: `m365-${alert.AlertId}`,
    title: alert.AlertName,
    description: `${alert.Category} - ${alert.Subject || 'No subject'}`,
    severity: severityMap[alert.Severity] || 'medium',
    source: 'microsoft_365',
    timestamp: new Date(alert.DateTimeCreated),
    indicators: {},
    assets: {
      users: alert.UserId ? [alert.UserId] : [],
      emails: alert.MailboxPrimaryOwnerEmail ? [alert.MailboxPrimaryOwnerEmail] : [],
    },
    rawData: alert,
  };
}

/**
 * Normalize Okta alerts
 */
export function normalizeOktaAlert(alert: any): ZyraNormalizedAlert {
  const severityMap: Record<string, ZyraNormalizedAlert['severity']> = {
    'DEBUG': 'info',
    'INFO': 'info',
    'WARN': 'medium',
    'ERROR': 'high',
    'CRITICAL': 'critical',
  };

  return {
    id: `okta-${alert.uuid}`,
    title: alert.displayMessage || alert.message,
    description: alert.message,
    severity: severityMap[alert.severity] || 'medium',
    source: 'okta',
    timestamp: new Date(alert.published),
    indicators: {},
    assets: {
      users: alert.actor?.alternateId ? [alert.actor.alternateId] : [],
    },
    rawData: alert,
  };
}

/**
 * Normalize CrowdStrike alerts
 */
export function normalizeCrowdStrikeAlert(alert: any): ZyraNormalizedAlert {
  return {
    id: `crowdstrike-${alert.detect_id}`,
    title: alert.name || alert.detect_name,
    description: alert.description || alert.full_desc,
    severity: (alert.severity?.toLowerCase() as any) || 'medium',
    source: 'crowdstrike',
    timestamp: new Date(alert.created_timestamp),
    indicators: {
      hashes: alert_sha ? [alert_sha] : [],
      ips: alert.ip_addrs ? Object.values(alert.ip_addrs) : [],
    },
    assets: {
      devices: alert.hostname ? [alert.hostname] : [],
    },
    rawData: alert,
  };
}

// ============================================
// Factory
// ============================================

export function createNangoService(): NangoService {
  const secretKey = process.env.NANGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error('NANGO_SECRET_KEY environment variable is required');
  }
  
  return new NangoService({
    nangoSecretKey: secretKey,
    nangoUrl: process.env.NANGO_URL,
  });
}

// ============================================
// Supported Integrations
// ============================================

export const SUPPORTED_INTEGRATIONS = [
  {
    id: 'microsoft_365',
    name: 'Microsoft 365',
    description: 'Email security, Teams, SharePoint alerts',
    models: ['microsoft_365_security_alerts'],
    scope: 'SecurityAlert.Read.All',
  },
  {
    id: 'microsoft_defender',
    name: 'Microsoft Defender for Endpoint',
    description: 'Endpoint detection and response',
    models: ['defender_alerts'],
    scope: 'SecurityAlert.Read.All',
  },
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    description: 'Gmail, Drive, Calendar security alerts',
    models: ['google_workspace_alerts'],
    scope: 'admin.googleapis.com',
  },
  {
    id: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    description: 'Endpoint protection platform',
    models: ['crowdstrike_alerts'],
    scope: 'incident.read',
  },
  {
    id: 'okta',
    name: 'Okta Identity Cloud',
    description: 'Identity and access management',
    models: ['okta_system_log'],
    scope: 'okta.logs.read',
  },
  {
    id: 'azure_ad',
    name: 'Azure Active Directory',
    description: 'Entra ID security alerts',
    models: ['azure_ad_signin_logs'],
    scope: 'AuditLog.Read.All',
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'CloudTrail, GuardDuty alerts',
    models: ['aws_cloudtrail_events'],
    scope: 'cloudtrail:ReadOnly',
  },
] as const;

export default {
  NangoService,
  createNangoService,
  normalizeDefenderAlert,
  normalizeM365Alert,
  normalizeOktaAlert,
  normalizeCrowdStrikeAlert,
  SUPPORTED_INTEGRATIONS,
};