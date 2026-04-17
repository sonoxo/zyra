/**
 * Autonomous Response Engine
 * Executes automated security responses based on MITRE mappings and playbooks
 * 
 * Aligned with:
 * - MITRE ATT&CK framework
 * - NIST SP 800-207 (Zero Trust Architecture)
 * - D3FEND defense techniques
 */

import type { 
  Threat, 
  Incident, 
  MappedThreat, 
  ResponsePlaybook, 
  AutonomousLevel,
  DEFAULT_PLAYBOOKS,
  DEFAULT_TECHNIQUE_MAPPINGS
} from '@zyra/types'

import { DEFAULT_PLAYBOOKS, DEFAULT_TECHNIQUE_MAPPINGS } from '@zyra/types'

export interface AutonomousConfig {
  /** Current autonomous level (0-4) */
  level: AutonomousLevel
  /** Organization ID */
  orgId: string
  /** Enable automatic playbook execution */
  autoExecute: boolean
  /** Maximum time before human review (ms) */
  maxReviewTimeMs: number
}

export interface ExecutionResult {
  success: boolean
  playbookId: string
  actionsExecuted: string[]
  errors?: string[]
  timestamp: Date
}

export class AutonomousResponseEngine {
  private config: AutonomousConfig
  private playbooks: ResponsePlaybook[]
  private executionHistory: ExecutionResult[]

  constructor(config: AutonomousConfig) {
    this.config = config
    this.playbooks = [...DEFAULT_PLAYBOOKS]
    this.executionHistory = []
  }

  /**
   * Map a threat to MITRE techniques
   */
  mapThreatToMitre(threat: Threat): MappedThreat {
    const category = threat.category?.toLowerCase() || ''
    const title = threat.title?.toLowerCase() || ''
    
    // Find matching techniques
    let mappedTechniques = DEFAULT_TECHNIQUE_MAPPINGS[category] || []
    if (mappedTechniques.length === 0) {
      // Try searching by title keywords
      for (const [key, techniques] of Object.entries(DEFAULT_TECHNIQUE_MAPPINGS)) {
        if (title.includes(key.toLowerCase()) || category.includes(key.toLowerCase())) {
          mappedTechniques = techniques
          break
        }
      }
    }

    // Determine autonomous level based on threat severity
    const autoLevel = this.getAutonomousLevelForSeverity(threat.severity)
    const responseAction = this.getRecommendedAction(threat.severity)

    return {
      ...threat,
      mitreTechniques: mappedTechniques,
      autonomousLevel: autoLevel,
      autoResponseAction: responseAction,
      confidence: this.calculateConfidence(mappedTechniques, threat.severity),
      indicators: this.extractIndicators(threat)
    }
  }

  /**
   * Evaluate if a threat should trigger automated response
   */
  shouldAutoRespond(threat: MappedThreat): boolean {
    // Check autonomous level requirement
    if (threat.autonomousLevel && threat.autonomousLevel > this.config.level) {
      return false
    }

    // Check if playbook exists for this threat
    const matchingPlaybook = this.playbooks.find(pb => {
      if (!pb.enabled) return false
      
      // Check threat level
      if (pb.triggerThreatLevel && pb.triggerThreatLevel !== threat.severity) {
        return false
      }

      // Check MITRE techniques
      if (pb.triggerMitre?.length) {
        const threatTechniques = threat.mitreTechniques?.map(t => t.id) || []
        const hasMatch = pb.triggerMitre.some(t => threatTechniques.includes(t))
        if (!hasMatch) return false
      }

      return true
    })

    return !!matchingPlaybook && this.config.autoExecute
  }

  /**
   * Execute automated response
   */
  async executeAutoResponse(threat: MappedThreat): Promise<ExecutionResult> {
    const playbook = this.playbooks.find(pb => {
      if (!pb.enabled) return false
      if (pb.triggerThreatLevel && pb.triggerThreatLevel !== threat.severity) return false
      return true
    })

    if (!playbook) {
      return {
        success: false,
        playbookId: 'none',
        actionsExecuted: [],
        errors: ['No matching playbook found'],
        timestamp: new Date()
      }
    }

    // Check autonomous level
    if (playbook.minAutonomousLevel > this.config.level) {
      return {
        success: false,
        playbookId: playbook.id,
        actionsExecuted: [],
        errors: [`Autonomous level ${this.config.level} too low. Required: ${playbook.minAutonomousLevel}`],
        timestamp: new Date()
      }
    }

    const executedActions: string[] = []
    const errors: string[] = []

    // Execute playbook actions
    for (const action of playbook.actions) {
      try {
        await this.executeAction(action, threat)
        executedActions.push(action.type)
        
        // Apply delay if specified
        if (action.delayMs) {
          await this.delay(action.delayMs)
        }
      } catch (error: any) {
        errors.push(`Action ${action.type} failed: ${error.message}`)
        
        // Rollback on critical failure
        if (playbook.rollbackActions?.length) {
          await this.executeRollback(playbook.rollbackActions)
        }
        
        break
      }
    }

    const result: ExecutionResult = {
      success: errors.length === 0,
      playbookId: playbook.id,
      actionsExecuted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date()
    }

    this.executionHistory.push(result)
    return result
  }

  /**
   * Get execution history
   */
  getHistory(limit: number = 10): ExecutionResult[] {
    return this.executionHistory.slice(-limit)
  }

  /**
   * Add custom playbook
   */
  addPlaybook(playbook: ResponsePlaybook): void {
    this.playbooks.push(playbook)
  }

  /**
   * Get available playbooks
   */
  getPlaybooks(): ResponsePlaybook[] {
    return [...this.playbooks]
  }

  // Private methods

  private getAutonomousLevelForSeverity(severity: string): AutonomousLevel {
    switch (severity) {
      case 'CRITICAL':
        return this.config.level >= AutonomousLevel.ASSISTED 
          ? AutonomousLevel.ASSISTED 
          : AutonomousLevel.MANUAL
      case 'HIGH':
        return this.config.level >= AutonomousLevel.HIGH_AUTO 
          ? AutonomousLevel.HIGH_AUTO 
          : AutonomousLevel.HITL
      case 'MEDIUM':
        return AutonomousLevel.HITL
      default:
        return AutonomousLevel.MANUAL
    }
  }

  private getRecommendedAction(severity: string): MappedThreat['autoResponseAction'] {
    switch (severity) {
      case 'CRITICAL':
        return 'ISOLATE'
      case 'HIGH':
        return 'QUARANTINE'
      case 'MEDIUM':
        return 'ALERT'
      default:
        return 'LOG'
    }
  }

  private calculateConfidence(
    techniques: any[], 
    severity: string
  ): number {
    let confidence = 50 // Base

    // MITRE mapping adds confidence
    confidence += techniques.length * 15

    // Severity adds confidence
    switch (severity) {
      case 'CRITICAL':
        confidence += 30
        break
      case 'HIGH':
        confidence += 20
        break
      case 'MEDIUM':
        confidence += 10
        break
      default:
        break
    }

    return Math.min(confidence, 100)
  }

  private extractIndicators(threat: Threat): string[] {
    const indicators: string[] = []
    
    if (threat.cve) {
      indicators.push(`CVE: ${threat.cve}`)
    }
    if (threat.category) {
      indicators.push(`Category: ${threat.category}`)
    }
    
    return indicators
  }

  private async executeAction(
    action: ResponsePlaybook['actions'][0], 
    threat: MappedThreat
  ): Promise<void> {
    switch (action.type) {
      case 'ALERT':
        console.log(`[AUTONOMOUS] Alert triggered for threat: ${threat.id}`)
        // Would send to Discord/Slack/Email
        break
        
      case 'ISOLATE':
        console.log(`[AUTONOMOUS] Isolating asset: ${threat.assetId}`)
        // Would call asset isolation API
        break
        
      case 'BLOCK':
        console.log(`[AUTONOMOUS] Blocking: ${action.target}`)
        // Would call firewall/blocklist API
        break
        
      case 'QUARANTINE':
        console.log(`[AUTONOMOUS] Quarantining: ${threat.id}`)
        // Would move to quarantine
        break
        
      case 'ROLLBACK':
        console.log(`[AUTONOMOUS] Rolling back changes`)
        // Would execute rollback
        break
        
      case 'WEBHOOK':
        console.log(`[AUTONOMOUS] Sending webhook to: ${action.params?.url}`)
        // Would send webhook
        break
        
      default:
        console.log(`[AUTONOMOUS] Unknown action: ${action.type}`)
    }
  }

  private async executeRollback(
    actions: ResponsePlaybook['rollbackActions']
  ): Promise<void> {
    for (const action of actions) {
      console.log(`[AUTONOMOUS] Rollback: ${action.type}`)
      // Execute rollback
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton factory
export function createAutonomousEngine(config: AutonomousConfig) {
  return new AutonomousResponseEngine(config)
}