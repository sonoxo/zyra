'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, Lock, Eye, Activity, AlertTriangle, CheckCircle, 
  Bot, Zap, Users, Settings, Bell, Plus, Search, 
  TrendingUp, Globe, Server, Database
} from 'lucide-react'
import { useAuth } from "../../context/AuthContext"
import { orgs, assets, threats, incidents, activities } from "../../lib/api"
import { HelpTooltip } from "@/components/HelpTooltip"

interface ActivityLog {
  id: string
  action: string
  entityType: string
  description: string
  createdAt: string
}

export default function UnifiedDashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'shadow-ai' | 'compliance' | 'assets'>('overview')
  const [orgList, setOrgList] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([])
  const [assetList, setAssetList] = useState<any[]>([])
  const [threatList, setThreatList] = useState<any[]>([])
  const [incidentList, setIncidentList] = useState<any[]>([])
  const [orgLoading, setOrgLoading] = useState(true)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      loadOrgs()
    }
  }, [user])

  async function loadOrgs() {
    try {
      const data = await orgs.list()
      setOrgList(data || [])
      if (data?.length > 0) {
        setSelectedOrg(data[0])
        loadOrgData(data[0].id)
      }
    } catch (e) {
      console.error("Failed to load orgs", e)
      setOrgLoading(false)
    }
  }

  async function loadOrgData(orgId: string) {
    try {
      setOrgLoading(true)
      const [activitiesData, assetsData, threatsData, incidentsData] = await Promise.all([
        activities.list(),
        assets.list(),
        threats.list(),
        incidents.list()
      ])
      setActivityLog(activitiesData || [])
      setAssetList(assetsData || [])
      setThreatList(threatsData || [])
      setIncidentList(incidentsData || [])
    } catch (e) {
      console.error("Failed to load org data", e)
    } finally {
      setOrgLoading(false)
    }
  }

  const securityScore = threatList.length === 0 ? 85 : Math.max(0, 100 - threatList.filter(t => t.status === 'OPEN').length * 15)
  const grade = securityScore >= 90 ? 'A' : securityScore >= 80 ? 'B' : securityScore >= 70 ? 'C' : securityScore >= 60 ? 'D' : 'F'

  const stats = [
    { icon: Shield, label: 'Security Score', value: `${securityScore}/100`, color: securityScore >= 80 ? 'text-green-400' : 'text-yellow-400', note: `Grade: ${grade}`, helpKey: 'dashboard-score' },
    { icon: Lock, label: 'Assets', value: `${assetList.length}`, color: 'text-cyan-400', note: assetList.length === 0 ? 'Add assets to protect' : 'Monitored', helpKey: 'assets' },
    { icon: Eye, label: 'Threats', value: `${threatList.filter(t => t.status === 'OPEN').length}`, color: threatList.filter(t => t.status === 'OPEN').length > 0 ? 'text-red-400' : 'text-green-400', note: 'Open threats', helpKey: 'threats-list' },
    { icon: Bot, label: 'Shadow AI', value: '2', color: 'text-orange-400', note: 'High risk findings', helpKey: 'ai-scanner', onClick: () => router.push('/shadow-ai') },
  ]

  const recentActivity = [
    { icon: Shield, action: 'Security scan completed', time: '2 min ago' },
    { icon: Bot, action: 'AI threat detected', time: '15 min ago' },
    { icon: Lock, action: 'New asset added', time: '1 hour ago' },
    { icon: Eye, action: 'Threat resolved', time: '3 hours ago' },
  ]

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra</span>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-sm font-medium text-cyan-400">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back. Here's your security posture.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/shadow-ai')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
            >
              <Bot className="w-4 h-4" />
              Shadow AI
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium rounded-lg transition-colors">
              <Zap className="w-4 h-4" />
              Run Scan
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div 
              key={i} 
              className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${stat.onClick ? 'cursor-pointer hover:border-cyan-500/50 transition-colors' : ''}`}
              onClick={stat.onClick}
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <div className="text-sm text-gray-400">
                {stat.helpKey ? (
                  <HelpTooltip helpKey={stat.helpKey}>{stat.label}</HelpTooltip>
                ) : stat.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.note}</div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => router.push('/scan')} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">Run Security Scan</span>
                </div>
                <span className="text-gray-500">→</span>
              </button>
              <button onClick={() => router.push('/shadow-ai')} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4 text-orange-400" />
                  <span className="text-sm">Scan Shadow AI</span>
                </div>
                <span className="text-gray-500">→</span>
              </button>
              <button onClick={() => router.push('/compliance')} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Compliance Status</span>
                </div>
                <span className="text-gray-500">→</span>
              </button>
              <button onClick={() => router.push('/resources')} className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">Learn & Resources</span>
                </div>
                <span className="text-gray-500">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Threat List */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Open Threats</h3>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
          </div>
          {threatList.filter(t => t.status === 'OPEN').length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">No open threats. Your assets are protected.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {threatList.filter(t => t.status === 'OPEN').slice(0, 5).map((threat: any) => (
                <div key={threat.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      threat.severity === 'CRITICAL' ? 'text-red-400' :
                      threat.severity === 'HIGH' ? 'text-orange-400' :
                      threat.severity === 'MEDIUM' ? 'text-yellow-400' : 'text-blue-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{threat.title}</p>
                      <p className="text-xs text-gray-500">{threat.category} • {threat.assetId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    threat.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    threat.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    threat.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {threat.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}