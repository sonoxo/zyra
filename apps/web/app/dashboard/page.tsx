"use client"

import { Shield, Lock, Eye, Activity, AlertTriangle, CheckCircle, XCircle, Plus } from "lucide-react"
import { useState } from "react"

type Threat = { id: string; title: string; severity: string; status: string }
type Incident = { id: string; title: string; priority: string; status: string }

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'incidents'>('overview')
  const [threats, setThreats] = useState<Threat[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  
  const securityScore = threats.length === 0 ? 85 : Math.max(0, 100 - threats.length * 10)
  const grade = securityScore >= 90 ? 'A' : securityScore >= 80 ? 'B' : securityScore >= 70 ? 'C' : securityScore >= 60 ? 'D' : 'F'
  
  const stats = [
    { icon: Shield, label: 'Security Score', value: `${securityScore}/100`, color: securityScore >= 80 ? 'text-green-400' : 'text-yellow-400' },
    { icon: Lock, label: 'Assets Protected', value: '0', color: 'text-cyan-400', note: 'Connect assets to start' },
    { icon: Eye, label: 'Active Threats', value: '0', color: 'text-green-400', note: 'No threats detected' },
    { icon: Activity, label: 'Open Incidents', value: '0', color: 'text-blue-400', note: 'All clear' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">security@example.com</span>
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">S</div>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'threats', 'incidents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 text-sm font-medium capitalize ${
                  activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Security Score</h2>
                  <p className="text-gray-400">Based on your asset protection status</p>
                </div>
                <div className="text-7xl font-bold text-cyan-400">{grade}</div>
              </div>
              <div className="mt-6 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${securityScore}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.note && <p className="text-xs text-gray-500 mt-1">{stat.note}</p>}
                </div>
              ))}
            </div>

            {threats.length === 0 && incidents.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Get Started</h3>
                <p className="text-gray-400 mb-6">Connect your first asset to start monitoring security</p>
                <button className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium">
                  <Plus className="w-5 h-5 mr-2" /> Add Asset
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'threats' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800"><h3 className="text-lg font-bold">Threats</h3></div>
            {threats.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-400">No threats detected</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {threats.map((threat) => (
                  <div key={threat.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span>{threat.title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${threat.severity === 'CRITICAL' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                      {threat.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800"><h3 className="text-lg font-bold">Incidents</h3></div>
            {incidents.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-400">No open incidents</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {incidents.map((incident) => (
                  <div key={incident.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span>{incident.title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${incident.priority === 'CRITICAL' ? 'bg-red-900 text-red-400' : 'bg-blue-900 text-blue-400'}`}>
                      {incident.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
