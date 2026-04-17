/**
 * Zyra Help System
 * Context-aware guidance for users
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'

// Help content definitions
export const HELP_CONTENT: Record<string, { title: string; content: string }> = {
  'dashboard-score': {
    title: 'Security Score',
    content: 'Your overall security score (0-100). Higher is better. Scores below 70 indicate critical vulnerabilities requiring immediate attention.'
  },
  'scan-button': {
    title: 'Run Scan',
    content: 'Start a security scan on your assets. Full scans check for vulnerabilities, open ports, SSL issues, and compliance gaps. Quick scans focus on critical CVEs.'
  },
  'threats-list': {
    title: 'Threats',
    content: 'List of detected vulnerabilities and security issues. Each threat shows severity (CRITICAL/HIGH/MEDIUM/LOW), affected asset, and recommended remediation.'
  },
  'compliance-card': {
    title: 'Compliance Status',
    content: 'Track compliance with security frameworks (SOC 2, PCI DSS, HIPAA, ISO 27001). Green checks indicate passing controls.'
  },
  'ai-copilot': {
    title: 'AI Copilot',
    content: 'Your AI security analyst. Ask questions about threats, get remediation advice, or request vulnerability analysis.'
  },
  'api-keys': {
    title: 'API Keys',
    content: 'Manage API keys for programmatic access. Keep secrets secure — never expose them in client-side code.'
  },
  'integrations': {
    title: 'Integrations',
    content: 'Connect Zyra with Slack, Discord, GitHub, cloud providers, and more to automate security workflows.'
  }
}

interface HelpContextType {
  showHelp: (key: string) => void
  hideHelp: () => void
  currentHelp: { key: string; title: string; content: string } | null
  isNewUser: boolean
  dismissOnboarding: () => void
}

const HelpContext = createContext<HelpContextType | null>(null)

export function HelpProvider({ children }: { children: ReactNode }) {
  const [currentHelp, setCurrentHelp] = useState<{ key: string; title: string; content: string } | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    // Check if user is new (first visit)
    const visited = localStorage.getItem('zyra_visited')
    if (!visited) {
      setIsNewUser(true)
      localStorage.setItem('zyra_visited', 'true')
    }
  }, [])

  const showHelp = (key: string) => {
    const content = HELP_CONTENT[key]
    if (content) {
      setCurrentHelp({ key, ...content })
    }
  }

  const hideHelp = () => setCurrentHelp(null)
  const dismissOnboarding = () => setIsNewUser(false)

  return (
    <HelpContext.Provider value={{ showHelp, hideHelp, currentHelp, isNewUser, dismissOnboarding }}>
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider')
  }
  return context
}