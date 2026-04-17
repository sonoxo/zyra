/**
 * MITRE ATT&CK & ATLAS Integration
 * Maps threats to industry-standard frameworks for autonomous security operations
 * 
 * References:
 * - MITRE ATT&CK: https://attack.mitre.org
 * - MITRE ATLAS: https://atlas.mitre.org
 * - NIST SP 800-207 (Zero Trust)
 * - D3FEND: https://d3fend.mitre.org
 */

// MITRE ATT&CK Tactics (Enterprise)
export enum MitreTactic {
  RECON = 'TA0043',           // Reconnaissance
  RESOURCE = 'TA0042',       // Resource Development
  INITIAL_ACCESS = 'TA0001', // Initial Access
  EXECUTION = 'TA0002',      // Execution
  PERSISTENCE = 'TA0003',    // Persistence
  PRIV_ESC = 'TA0004',       // Privilege Escalation
  DEFENSE_EVASION = 'TA0005',// Defense Evasion
  CRED_ACCESS = 'TA0006',    // Credential Access
  DISCOVERY = 'TA0007',       // Discovery
  LATERAL_MOVEMENT = 'TA0008',// Lateral Movement
  COLLECTION = 'TA0009',     // Collection
  C2 = 'TA0011',             // Command and Control
  EXFIL = 'TA0010',          // Exfiltration
  IMPACT = 'TA0040',         // Impact
}

// MITRE ATLAS Tactics (AI-specific)
export enum AtlasTactic {
  COLLECT_AI_DATA = 'ATPH0001',     // Collect AI Training Data
  OBTAIN_MODEL_ACCESS = 'ATPH0002', // Obtain Model Access
  ALTER_MODEL = 'ATPH0003',         // Alter Model Behavior
  EXFIL_MODEL = 'ATPH0004',         // Exfiltrate Model/Weights
  INJECT_PROMPTS = 'ATPH0005',      // Inject Malicious Prompts
  BYPASS_SAFEGUARDS = 'ATPH0006',   // Bypass Safeguards
  COMPROMISE_INFRA = 'ATPH0007',    // Compromise Compute Infra
  EXECUTE_AUTONOMY = 'ATPH0008',    // Execute Autonomous Actions
}

// Autonomous Response Levels (aligned with NIST SP 800-207)
export enum AutonomousLevel {
  /**
   * LEVEL 0: Manual Only
   * All actions require human approval
   */
  MANUAL = 0,
  
  /**
   * LEVEL 1: Human-In-The-Loop
   * AI suggests actions, human approves execution
   */
  HITL = 1,
  
  /**
   * LEVEL 2: Assisted Automation
   * AI executes pre-approved playbooks automatically
   * e.g., auto-isolate endpoint on ransomware detection
   */
  ASSISTED = 2,
  
  /**
   * LEVEL 3: High Automation
   * AI executes autonomously with human monitoring
   * Rollback, containment, remediation automatic
   */
  HIGH_AUTO = 3,
  
  /**
   * LEVEL 4: Full Autonomy
   * Complete autonomous operation with AI-driven decision making
   * Human only for post-incident review
   */
  FULL_AUTO = 4,
}

// MITRE Technique mapping
export interface MappedTechnique {
  id: string           // e.g., "T1566" (Phishing)
  name: string         // e.g., "Phishing"
  tactic: MitreTactic | AtlasTactic
  description: string
  detectionMethod: string
  mitigation: string[]
}

// Threat with MITRE mapping
export interface MappedThreat {
  // Standard threat fields
  id: string
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  description: string
  
  // MITRE mapping
  mitreTechniques?: MappedTechnique[]
  attackKillChain?: ('recon' | 'weaponize' | 'deliver' | 'exploit' | 'install' | 'command' | 'actions')[]
  
  // Autonomous response
  autonomousLevel?: AutonomousLevel
  autoResponseAction?: 'LOG' | 'ALERT' | 'ISOLATE' | 'BLOCK' | 'QUARANTINE' | 'ROLLBACK'
  
  // Confidence score (0-100)
  confidence?: number
  
  // Evidence
  indicators?: string[]
  mitreId?: string   // e.g., "T1566.001"
}

// Response playbook
export interface ResponsePlaybook {
  id: string
  name: string
  description: string
  
  // Trigger conditions
  triggerThreatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  triggerCategories?: string[]
  triggerMitre?: string[]  // Technique IDs
  
  // Minimum autonomous level to execute
  minAutonomousLevel: AutonomousLevel
  
  // Actions to execute (in order)
  actions: {
    type: 'ALERT' | 'ISOLATE' | 'BLOCK' | 'QUARANTINE' | 'ROLLBACK' | 'EMAIL' | 'WEBHOOK'
    target?: string        // e.g., IP address, asset ID
    params?: Record<string, any>
    delayMs?: number      // Delay between actions
  }[]
  
  // Rollback plan
  rollbackActions?: {
    type: string
    target?: string
  }[]
  
  // Metadata
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// Defense technique (D3FEND-style)
export interface DefenseTechnique {
  id: string
  name: string
  category: 'DETECT' | 'PREVENT' | 'ISOLATE' | 'REMEDIATE' | 'RESTORE'
  description: string
  applicableTo: string[]  // Asset types
  mitreTechniques?: string[]
}

// Compliance mapping
export interface ComplianceMapping {
  framework: 'NIST' | 'ISO27001' | 'SOC2' | 'HIPAA' | 'PCI' | 'CIS'
  controls: {
    id: string
    name: string
    description: string
    coveredBy: string[]  // Zyra features
  }[]
}

// Security event with full context
export interface ContextualEvent {
  id: string
  timestamp: Date
  source: 'SCANNER' | 'SIEM' | 'EDR' | 'NETWORK' | 'CLOUD' | 'API'
  
  // Event data
  eventType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  
  // MITRE mapping
  mappedTechniques?: MappedTechnique[]
  
  // Autonomous response
  autonomousLevel: AutonomousLevel
  recommendedAction?: string
  autoExecuted?: boolean
  
  // Related entities
  assetId?: string
  threatId?: string
  incidentId?: string
  
  // Raw data
  rawData?: Record<string, any>
}

// Default MITRE mappings for common threats
export const DEFAULT_TECHNIQUE_MAPPINGS: Record<string, MappedTechnique[]> = {
  'SQL Injection': [
    {
      id: 'T1190',
      name: 'Exploit Public-Facing Application',
      tactic: MitreTactic.INITIAL_ACCESS,
      description: 'SQL injection in web application',
      detectionMethod: 'Monitor for unusual database queries, error messages',
      mitigation: ['Input validation', 'Parameterized queries', 'WAF']
    },
    {
      id: 'T1059.004',
      name: 'Command and Scripting Interpreter: SQL',
      tactic: MitreTactic.EXECUTION,
      description: 'Execution via SQL commands',
      detectionMethod: 'Monitor SQL command execution',
      mitigation: ['Database hardening', 'Least privilege']
    }
  ],
  'XSS': [
    {
      id: 'T1189',
      name: 'Drive-by Compromise',
      tactic: MitreTactic.INITIAL_ACCESS,
      description: 'XSS via malicious script injection',
      detectionMethod: 'Content Security Policy violations, script tags in input',
      mitigation: ['Content Security Policy', 'Input sanitization', 'Output encoding']
    }
  ],
  'Ransomware': [
    {
      id: 'T1486',
      name: 'Data Encrypted for Impact',
      tactic: MitreTactic.IMPACT,
      description: 'Ransomware encryption of files',
      detectionMethod: 'File encryption activity, unusual file modifications',
      mitigation: ['Backup strategy', 'Endpoint detection', 'Network segmentation']
    },
    {
      id: 'T1490',
      name: 'Inhibit System Recovery',
      tactic: MitreTactic.IMPACT,
      description: 'Disabling recovery mechanisms',
      detectionMethod: 'Changes to recovery mechanisms, shadow copies deleted',
      mitigation: ['Backup protection', 'System state monitoring']
    }
  ],
  'Phishing': [
    {
      id: 'T1566',
      name: 'Phishing',
      tactic: MitreTactic.INITIAL_ACCESS,
      description: 'Social engineering via email',
      detectionMethod: 'Email filtering, link analysis',
      mitigation: ['Email security', 'User training', 'MFA']
    }
  ],
  'Brute Force': [
    {
      id: 'T1110',
      name: 'Brute Force',
      tactic: MitreTactic.CRED_ACCESS,
      description: 'Credential guessing attacks',
      detectionMethod: 'Failed login attempts, account lockouts',
      mitigation: ['Account lockout', 'MFA', 'Rate limiting']
    }
  ]
}

// Default response playbooks
export const DEFAULT_PLAYBOOKS: ResponsePlaybook[] = [
  {
    id: 'pb_ransomware_auto',
    name: 'Ransomware Auto-Containment',
    description: 'Immediately isolate endpoint when ransomware behavior detected',
    triggerThreatLevel: 'CRITICAL',
    triggerCategories: ['Ransomware', 'Malware'],
    triggerMitre: ['T1486', 'T1490'],
    minAutonomousLevel: AutonomousLevel.ASSISTED,
    actions: [
      { type: 'ALERT', params: { channels: ['discord', 'slack'] } },
      { type: 'ISOLATE', delayMs: 1000 },
      { type: 'WEBHOOK', params: { url: process.env.SOC_WEBHOOK_URL }, delayMs: 2000 }
    ],
    rollbackActions: [
      { type: 'UNISOLATE' }
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'pb_brute_force',
    name: 'Brute Force Protection',
    description: 'Block IP after multiple failed login attempts',
    triggerThreatLevel: 'HIGH',
    triggerCategories: ['Brute Force', 'Authentication'],
    triggerMitre: ['T1110'],
    minAutonomousLevel: AutonomousLevel.HIGH_AUTO,
    actions: [
      { type: 'ALERT' },
      { type: 'BLOCK', delayMs: 500 }
    ],
    rollbackActions: [
      { type: 'UNBLOCK', delayMs: 3600000 }  // 1 hour
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'pb_critical_vuln',
    name: 'Critical Vulnerability Alert',
    description: 'Immediate alert for critical severity vulnerabilities',
    triggerThreatLevel: 'CRITICAL',
    triggerCategories: ['Vulnerability'],
    triggerMitre: ['T1190', 'T1210'],
    minAutonomousLevel: AutonomousLevel.HITL,
    actions: [
      { type: 'ALERT', params: { channels: ['discord', 'email'], urgent: true } }
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]