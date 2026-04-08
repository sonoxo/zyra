/**
 * Zyra Privacy Scanner - HoundDog Integration
 * Detects PII, data leaks, and compliance issues in code
 * 
 * Usage:
 *   import { PrivacyScanner } from '@zyra/privacy-scanner';
 *   const scanner = new PrivacyScanner();
 *   const results = await scanner.scan('/path/to/code');
 */

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { z } from 'zod';

// ============================================
// Types
// ============================================

export interface DataFlow {
  source: string;
  sink: string;
  dataElement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  file?: string;
}

export interface PrivacyScanResult {
  scanPath: string;
  scanTime: string;
  findings: DataFlow[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  compliance: {
    gdpr: boolean;
    hipaa: boolean;
    pci: boolean;
  };
  riskScore: number;
}

export interface ScanOptions {
  path: string;
  allDataflows?: boolean;
  trace?: boolean;
  outputFormat?: 'json' | 'markdown';
}

// ============================================
// HoundDog Scanner
// ============================================

export class PrivacyScanner {
  private houndDogPath: string;

  constructor(houndDogPath?: string) {
    this.houndDogPath = houndDogPath || 'hounddog';
  }

  /**
   * Scan a codebase for privacy issues
   */
  async scan(options: ScanOptions): Promise<PrivacyScanResult> {
    const args = ['scan', options.path];
    
    if (options.allDataflows) args.push('--all-dataflows');
    if (options.trace) args.push('--trace');
    if (options.outputFormat === 'json') args.push('--output-format=json');
    
    return new Promise((resolve, reject) => {
      const outputs: string[] = [];
      const errors: string[] = [];
      
      const proc = spawn(this.houndDogPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      proc.stdout.on('data', (data) => outputs.push(data.toString()));
      proc.stderr.on('data', (data) => errors.push(data.toString()));
      
      proc.on('close', (code) => {
        if (code !== 0 && outputs.length === 0) {
          reject(new Error(`HoundDog scan failed: ${errors.join('')}`));
          return;
        }
        
        try {
          const result = this.parseOutput(outputs.join(''));
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Get supported data elements
   */
  async getDataElements(): Promise<string[]> {
    return this.runCommand(['data-elements']);
  }

  /**
   * Get supported data sinks
   */
  async getDataSinks(): Promise<string[]> {
    return this.runCommand(['data-sinks']);
  }

  /**
   * Run a simple HoundDog command
   */
  private async runCommand(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const outputs: string[] = [];
      const proc = spawn(this.houndDogPath, args, { stdio: 'pipe' });
      
      proc.stdout.on('data', (data) => outputs.push(data.toString()));
      
      proc.on('close', () => {
        resolve(outputs.join('').split('\n').filter(Boolean));
      });
      
      proc.on('error', reject);
    });
  }

  /**
   * Parse HoundDog JSON output
   */
  private parseOutput(output: string): PrivacyScanResult {
    try {
      const parsed = JSON.parse(output);
      
      // Calculate risk score
      const critical = parsed.critical?.length || 0;
      const high = parsed.high?.length || 0;
      const medium = parsed.medium?.length || 0;
      const low = parsed.low?.length || 0;
      const total = critical + high + medium + low;
      
      const riskScore = Math.max(0, 100 - (critical * 20 + high * 10 + medium * 5 + low * 2));
      
      return {
        scanPath: parsed.path || '',
        scanTime: new Date().toISOString(),
        findings: this.normalizeFindings(parsed),
        summary: { critical, high, medium, low, total },
        compliance: {
          gdpr: this.checkCompliance(parsed, ['pii', 'email', 'phone', 'ssn']),
          hipaa: this.checkCompliance(parsed, ['health', 'medical', 'diagnosis']),
          pci: this.checkCompliance(parsed, ['credit', 'card', 'payment']),
        },
        riskScore,
      };
    } catch (e) {
      // Return empty result if parsing fails
      return {
        scanPath: '',
        scanTime: new Date().toISOString(),
        findings: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        compliance: { gdpr: false, hipaa: false, pci: false },
        riskScore: 100,
      };
    }
  }

  /**
   * Normalize findings to Zyra format
   */
  private normalizeFindings(parsed: any): DataFlow[] {
    const findings: DataFlow[] = [];
    
    const severityMap: Record<string, DataFlow['severity']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    
    for (const [key, value] of Object.entries(parsed)) {
      if (key === 'path' || key === 'timestamp') continue;
      
      const items = value as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          findings.push({
            source: item.source || '',
            sink: item.sink || '',
            dataElement: item.dataElement || key,
            severity: severityMap[key] || 'medium',
            line: item.line,
            file: item.file,
          });
        }
      }
    }
    
    return findings;
  }

  /**
   * Check compliance flags
   */
  private checkCompliance(parsed: any, keywords: string[]): boolean {
    const findings = JSON.stringify(parsed).toLowerCase();
    return keywords.some(k => findings.includes(k));
  }
}

/**
 * Factory function
 */
export function createPrivacyScanner(): PrivacyScanner {
  return new PrivacyScanner();
}

// ============================================
// Zyra Integration
// ============================================

/**
 * Convert HoundDog results to Zyra alerts
 */
export function convertToZyraAlerts(result: PrivacyScanResult, orgId: string) {
  return result.findings.map((finding, idx) => ({
    id: `privacy-${Date.now()}-${idx}`,
    title: `Data Leak: ${finding.dataElement}`,
    description: `${finding.dataElement} flows from ${finding.source} to ${finding.sink}`,
    severity: finding.severity,
    source: 'privacy_scanner' as const,
    timestamp: new Date(result.scanTime),
    indicators: {
      data: [finding.dataElement],
      files: finding.file ? [finding.file] : [],
    },
    assets: {},
    orgId,
  }));
}

export default { PrivacyScanner, createPrivacyScanner, convertToZyraAlerts };