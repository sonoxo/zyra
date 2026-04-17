/**
 * MITRE ATT&CK & ATLAS Mappings
 * Static reference data for threat classification
 * 
 * Reference: https://attack.mitre.org https://atlas.mitre.org
 */

// MITRE ATT&CK Tactics
export const MITRE_TACTICS = {
  RECON: 'TA0043',
  RESOURCE_DEV: 'TA0042',
  INITIAL_ACCESS: 'TA0001',
  EXECUTION: 'TA0002',
  PERSISTENCE: 'TA0003',
  PRIV_ESC: 'TA0004',
  DEFENSE_EVASION: 'TA0005',
  CRED_ACCESS: 'TA0006',
  DISCOVERY: 'TA0007',
  LATERAL_MOVEMENT: 'TA0008',
  COLLECTION: 'TA0009',
  C2: 'TA0011',
  EXFIL: 'TA0010',
  IMPACT: 'TA0040',
} as const

// MITRE ATLAS Tactics (AI-specific)
export const ATLAS_TACTICS = {
  COLLECT_AI_DATA: 'ATPH0001',
  OBTAIN_MODEL_ACCESS: 'ATPH0002',
  ALTER_MODEL: 'ATPH0003',
  EXFIL_MODEL: 'ATPH0004',
  INJECT_PROMPTS: 'ATPH0005',
  BYPASS_SAFEGUARDS: 'ATPH0006',
  COMPROMISE_INFRA: 'ATPH0007',
  EXECUTE_AUTONOMY: 'ATPH0008',
} as const

// Common technique mappings
export const TECHNIQUE_MAPPINGS = {
  'SQL Injection': ['T1190', 'T1059.004'],
  'XSS': ['T1189'],
  'Ransomware': ['T1486', 'T1490'],
  'Phishing': ['T1566'],
  'Brute Force': ['T1110'],
} as const

// Autonomous response levels (NIST SP 800-207)
export const AUTONOMOUS_LEVELS = {
  MANUAL: 0,
  HITL: 1,
  ASSISTED: 2,
  HIGH_AUTO: 3,
  FULL_AUTO: 4,
} as const