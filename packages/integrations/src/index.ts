/**
 * Zyra Integrations Package
 * Unified data source connections via Nango
 * 
 * @example
 * import { createNangoService, normalizeDefenderAlert } from '@zyra/integrations';
 * 
 * const nango = createNangoService();
 * const alerts = await nango.getRecords('connection-id', 'microsoft_defender', 'alerts');
 */

export * from './nango.js';

// Re-export types
export type { ZyraNormalizedAlert, IntegrationProvider, IntegrationConfig } from './nango.js';

// Re-export normalizers
export { 
  normalizeDefenderAlert, 
  normalizeM365Alert, 
  normalizeOktaAlert, 
  normalizeCrowdStrikeAlert 
} from './nango.js';

// Re-export supported integrations
export { SUPPORTED_INTEGRATIONS } from './nango.js';