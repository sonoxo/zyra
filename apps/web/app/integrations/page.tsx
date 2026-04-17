'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  ExternalLink, Webhook, Key, Lock, Globe, Bell, Github, Slack
} from 'lucide-react'
import { useAuth } from "../../context/AuthContext"

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync?: string
  events?: number
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Real-time security alerts to your Slack workspace', icon: 'slack', status: 'disconnected' },
  { id: 'discord', name: 'Discord', description: 'Security notifications via Discord webhooks', icon: 'discord', status: 'disconnected' },
  { id: 'github', name: 'GitHub', description: 'Scan repositories for secrets and vulnerabilities', icon: 'github', status: 'disconnected' },
  { id: 'm365', name: 'Microsoft 365', description: 'Monitor M365 security suite', icon: 'globe', status: 'disconnected' },
  { id: 'defender', name: 'Microsoft Defender', description: 'Endpoint detection and response', icon: 'shield', status: 'disconnected' },
  { id: 'crowdstrike', name: 'CrowdStrike', description: 'Falcon endpoint protection', icon: 'shield', status: 'disconnected' },
  { id: 'pagerduty', name: 'PagerDuty', description: 'On-call scheduling and incident management', icon: 'bell', status: 'disconnected' },
  { id: 'jira', name: 'Jira', description: 'Create tickets for security findings', icon: 'globe', status: 'disconnected' },
]

export default function IntegrationsPage() {
  const { isAuthenticated, loading } = useAuth()
  const [integrations, setIntegrations] = useState<Integration[]>(AVAILABLE_INTEGRATIONS)
  const [syncing, setSyncing] = useState<string | null>(null)

  async function connectIntegration(id: string) {
    setSyncing(id)
    // Simulate connection
    await new Promise(r => setTimeout(r, 1500))
    setIntegrations(prev => prev.map(i => 
      i.id === id 
        ? { ...i, status: 'connected' as const, lastSync: new Date().toISOString(), events: Math.floor(Math.random() * 100) }
        : i
    ))
    setSyncing(null)
  }

  async function disconnectIntegration(id: string) {
    setIntegrations(prev => prev.map(i => 
      i.id === id 
        ? { ...i, status: 'disconnected' as const, lastSync: undefined, events: undefined }
        : i
    ))
  }

  async function syncIntegration(id: string) {
    setSyncing(id)
    await new Promise(r => setTimeout(r, 1000))
    setIntegrations(prev => prev.map(i => 
      i.id === id 
        ? { ...i, lastSync: new Date().toISOString() }
        : i
    ))
    setSyncing(null)
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'slack': return <Slack className="w-6 h-6" />
      case 'discord': return <span className="text-2xl">💬</span>
      case 'github': return <Github className="w-6 h-6" />
      case 'shield': return <Shield className="w-6 h-6" />
      case 'globe': return <Globe className="w-6 h-6" />
      case 'bell': return <Bell className="w-6 h-6" />
      default: return <Webhook className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Webhook className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Webhook className="w-8 h-8 text-cyan-400" />
            Integrations
          </h1>
          <p className="text-gray-400 mt-2">
            Connect your security tools and notification channels
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Connected</div>
            <div className="text-3xl font-bold text-green-400">{connectedCount}</div>
            <div className="text-gray-500 text-sm">of {integrations.length} integrations</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Events Today</div>
            <div className="text-3xl font-bold text-cyan-400">
              {integrations.filter(i => i.events).reduce((a, b) => a + (b.events || 0), 0)}
            </div>
            <div className="text-gray-500 text-sm">processed</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Status</div>
            <div className="flex items-center gap-2">
              {connectedCount > 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Operational</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">No integrations</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map(integration => (
            <div 
              key={integration.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                    {getIcon(integration.icon)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{integration.name}</h3>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  integration.status === 'connected' ? 'bg-green-400' :
                  integration.status === 'error' ? 'bg-red-400' : 'bg-gray-600'
                }`} />
              </div>

              {integration.status === 'connected' && (
                <div className="text-xs text-gray-400 mb-4">
                  {integration.lastSync && (
                    <p>Last sync: {new Date(integration.lastSync).toLocaleString()}</p>
                  )}
                  {integration.events && (
                    <p>{integration.events} events processed</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {integration.status === 'connected' ? (
                  <>
                    <button
                      onClick={() => syncIntegration(integration.id)}
                      disabled={syncing === integration.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === integration.id ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                    <button
                      onClick={() => disconnectIntegration(integration.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => connectIntegration(integration.id)}
                    disabled={syncing === integration.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium text-sm rounded-lg transition-colors"
                  >
                    {syncing === integration.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Webhook Info */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            Webhook Endpoints
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Security Alerts</p>
                <p className="text-xs text-gray-500">POST /api/webhooks/alerts</p>
              </div>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Threat Intelligence</p>
                <p className="text-xs text-gray-500">POST /api/webhooks/threats</p>
              </div>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Compliance Events</p>
                <p className="text-xs text-gray-500">POST /api/webhooks/compliance</p>
              </div>
              <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">Pending</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}