"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Lock, Eye, Activity, AlertTriangle, CheckCircle, XCircle, Plus, Users, Settings, LogOut, Bell, Zap, CreditCard, Check, Server, Database, Key, ShieldAlert } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { orgs, activities, assets, threats, incidents } from "../../lib/api"

interface ActivityLog {
  id: string
  action: string
  entityType: string
  description: string
  createdAt: string
}

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'incidents' | 'activity' | 'team' | 'billing' | 'admin' | 'settings'>('overview')
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
    } finally {
      setOrgLoading(false)
    }
  }

  async function loadOrgData(orgId: string) {
    try {
      const [activitiesData, assetsData, threatsData, incidentsData] = await Promise.all([
        activities.list(orgId),
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
    }
  }

  function handleOrgChange(org: any) {
    setSelectedOrg(org)
    loadOrgData(org.id)
  }

  const securityScore = threatList.length === 0 ? 85 : Math.max(0, 100 - threatList.filter(t => t.status === 'OPEN').length * 15)
  const grade = securityScore >= 90 ? 'A' : securityScore >= 80 ? 'B' : securityScore >= 70 ? 'C' : securityScore >= 60 ? 'D' : 'F'

  const stats = [
    { icon: Shield, label: 'Security Score', value: `${securityScore}/100`, color: securityScore >= 80 ? 'text-green-400' : 'text-yellow-400', note: `Grade: ${grade}` },
    { icon: Lock, label: 'Assets', value: `${assetList.length}`, color: 'text-cyan-400', note: assetList.length === 0 ? 'Add assets to protect' : 'Monitored' },
    { icon: Eye, label: 'Threats', value: `${threatList.filter(t => t.status === 'OPEN').length}`, color: threatList.filter(t => t.status === 'OPEN').length > 0 ? 'text-red-400' : 'text-green-400', note: 'Open threats' },
    { icon: Activity, label: 'Incidents', value: `${incidentList.filter(i => i.status === 'OPEN').length}`, color: incidentList.filter(i => i.status === 'OPEN').length > 0 ? 'text-yellow-400' : 'text-green-400', note: 'Open incidents' },
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
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <span className="text-gray-300 text-sm">{user?.name || user?.email}</span>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Shield },
                { id: 'threats', label: 'Threats', icon: Eye },
                { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
                { id: 'activity', label: 'Activity', icon: Activity },
                { id: 'team', label: 'Team', icon: Users },
                { id: 'billing', label: 'Billing', icon: CreditCard },
                { id: 'admin', label: 'Admin', icon: ShieldAlert },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            
            {orgList.length > 0 && (
              <select
                value={selectedOrg?.id || ''}
                onChange={(e) => {
                  const org = orgList.find(o => o.id === e.target.value)
                  if (org) handleOrgChange(org)
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {orgList.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.note}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {activityLog.slice(0, 5).map(activity => (
                    <div key={activity.id} className="flex items-center space-x-3 text-sm">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="text-gray-300">{activity.action}</span>
                      <span className="text-gray-500">{activity.entityType}</span>
                    </div>
                  ))}
                  {activityLog.length === 0 && (
                    <div className="text-gray-500 text-sm">No recent activity</div>
                  )}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm">Add Asset</span>
                  </button>
                  <button className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm">Run Scan</span>
                  </button>
                  <button className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <AlertTriangle className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm">Report Incident</span>
                  </button>
                  <button className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm">Invite Team</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'threats' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Threats</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span>Scan Asset</span>
              </button>
            </div>
            <div className="p-6">
              {threatList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <p>No threats detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {threatList.map(threat => (
                    <div key={threat.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className={`w-5 h-5 ${
                          threat.severity === 'CRITICAL' ? 'text-red-400' :
                          threat.severity === 'HIGH' ? 'text-orange-400' :
                          threat.severity === 'MEDIUM' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                        <div>
                          <div className="font-medium">{threat.title}</div>
                          <div className="text-sm text-gray-400">{threat.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          threat.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                          threat.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          threat.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {threat.severity}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          threat.status === 'OPEN' ? 'bg-red-500/20 text-red-400' :
                          threat.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {threat.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Incidents</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span>Create Incident</span>
              </button>
            </div>
            <div className="p-6">
              {incidentList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <p>All clear - no open incidents</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidentList.map(incident => (
                    <div key={incident.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <div>
                          <div className="font-medium">{incident.title}</div>
                          <div className="text-sm text-gray-400">{incident.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          incident.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                          incident.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          incident.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {incident.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          incident.status === 'OPEN' ? 'bg-red-500/20 text-red-400' :
                          incident.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Activity Log</h3>
            </div>
            <div className="p-6">
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLog.map(activity => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.action}</div>
                        {activity.description && (
                          <div className="text-xs text-gray-400">{activity.description}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            </div>
            <div className="p-6">
              {selectedOrg?.members?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>No team members yet</p>
                  <p className="text-sm">Invite members to collaborate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedOrg?.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-medium">
                          {member.user?.name?.[0] || member.user?.email?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="font-medium">{member.user?.name || member.user?.email}</div>
                          <div className="text-sm text-gray-400">{member.user?.email}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        member.role === 'OWNER' ? 'bg-purple-500/20 text-purple-400' :
                        member.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' :
                        member.role === 'MEMBER' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-700/20 text-gray-500'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'admin' && user?.role === 'ADMIN' || user?.role === 'OWNER' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400 text-sm">Total Users</span>
                </div>
                <div className="text-2xl font-bold">{selectedOrg?.members?.length || 0}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400 text-sm">Assets</span>
                </div>
                <div className="text-2xl font-bold">{assetList.length}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <ShieldAlert className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400 text-sm">Open Threats</span>
                </div>
                <div className="text-2xl font-bold">{threatList.filter(t => t.status === 'OPEN').length}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400 text-sm">API Keys</span>
                </div>
                <div className="text-2xl font-bold">-</div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold">System Health</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400">API Server</span>
                  <span className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Online</span>
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400">Database</span>
                  <span className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Connected</span>
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400">WebSocket</span>
                  <span className="flex items-center space-x-2 text-yellow-400">
                    <Activity className="w-4 h-4" />
                    <span>Standby</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold">Audit Log</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>Full audit log available in enterprise</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'settings' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Organization Name</label>
                <input
                  type="text"
                  defaultValue={selectedOrg?.name}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Plan</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <button className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold">Current Plan</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <div className="text-xl font-bold text-white">{selectedOrg?.plan || 'FREE'}</div>
                    <div className="text-sm text-gray-400">
                      {selectedOrg?.plan === 'ENTERPRISE' ? 'Unlimited everything' : selectedOrg?.plan === 'PRO' ? '100 scans, 50 assets' : '10 scans, 5 assets'}
                    </div>
                  </div>
                  <a href="/pricing" className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium inline-block">
                    Upgrade Plan
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'FREE', name: 'Free', price: '$0', features: ['10 scans', '5 assets', '1 team member', 'Community support'] },
                { id: 'PRO', name: 'Pro', price: '$49/mo', features: ['100 scans', '50 assets', '10 team members', 'Priority support', 'Advanced analytics'] },
                { id: 'ENTERPRISE', name: 'Enterprise', price: '$199/mo', features: ['Unlimited scans', 'Unlimited assets', 'Unlimited team', '24/7 support', 'Custom integrations'] },
              ].map(plan => (
                <div key={plan.id} className={`bg-gray-900 border rounded-xl p-6 ${selectedOrg?.plan === plan.id ? 'border-cyan-500' : 'border-gray-800'}`}>
                  <div className="text-lg font-semibold mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-white mb-4">{plan.price}</div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center space-x-2 text-sm text-gray-400">
                        <Check className="w-4 h-4 text-cyan-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {selectedOrg?.plan === plan.id ? (
                    <button disabled className="w-full py-2 bg-gray-700 rounded-lg text-sm font-medium text-gray-400">
                      Current Plan
                    </button>
                  ) : (
                    <button className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium">
                      {plan.id === 'FREE' ? 'Downgrade' : 'Upgrade'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
