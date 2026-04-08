/**
 * Zyra Privacy Scanner Package
 * HoundDog integration for detecting PII, data leaks, and compliance issues
 * 
 * @example
 * import { PrivacyScanner, convertToZyraAlerts } from '@zyra/privacy-scanner';
 * 
 * const scanner = new PrivacyScanner();
 * const result = await scanner.scan({ path: './src' });
 * 
 * console.log('Risk Score:', result.riskScore);
 * console.log('GDPR Issues:', result.compliance.gdpr);
 */

export { PrivacyScanner, createPrivacyScanner, convertToZyraAlerts } from './hounddog.js';

export type { PrivacyScanResult, DataFlow, ScanOptions } from './hounddog.js';