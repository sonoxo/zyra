// Stripe billing integration stubs
// Replace with real Stripe integration when DB is available

export interface Subscription {
  id: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: Date
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void'
  paidAt?: Date
}

// Get pricing for plan
export function getPlanPrice(plan: string): number {
  switch (plan) {
    case 'PRO': return 4900 // $49.00
    case 'ENTERPRISE': return 19900 // $199.00
    default: return 0
  }
}

// Check if feature is included in plan
export function isFeatureIncluded(plan: string, feature: string): boolean {
  const planFeatures: Record<string, string[]> = {
    FREE: ['basic_scan', 'limited_reports'],
    PRO: ['basic_scan', 'limited_reports', 'advanced_scan', 'unlimited_scans', 'priority_support', 'webhooks'],
    ENTERPRISE: ['basic_scan', 'limited_reports', 'advanced_scan', 'unlimited_scans', 'priority_support', 'webhooks', 'custom_integrations', 'sla', 'dedicated_support']
  }
  
  return planFeatures[plan]?.includes(feature) ?? false
}

// Get plan limits
export function getPlanLimits(plan: string): {
  scansPerMonth: number
  assets: number
  teamMembers: number
  apiCallsPerDay: number
} {
  switch (plan) {
    case 'PRO':
      return { scansPerMonth: 100, assets: 50, teamMembers: 10, apiCallsPerDay: 1000 }
    case 'ENTERPRISE':
      return { scansPerMonth: -1, assets: -1, teamMembers: -1, apiCallsPerDay: -1 }
    default:
      return { scansPerMonth: 5, assets: 10, teamMembers: 3, apiCallsPerDay: 100 }
  }
}

// Validate upgrade request
export function canUpgradePlan(currentPlan: string, newPlan: string): boolean {
  const planHierarchy = ['FREE', 'PRO', 'ENTERPRISE']
  const currentIndex = planHierarchy.indexOf(currentPlan)
  const newIndex = planHierarchy.indexOf(newPlan)
  return newIndex > currentIndex
}