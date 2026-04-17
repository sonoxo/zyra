'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, Eye, RefreshCw, Activity, Bot } from 'lucide-react'
import { useAuth } from "../../context/AuthContext"
import { shadowAI } from '@/lib/api'

interface Finding {
  id: string
  type: 'endpoint' | 'extension' | 'saas' | 'local'
  name: string
  vendor: string
  url?: string
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  recommendation: string
}

interface ScanResult {
  findings: Finding[]
  summary: {
    total: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
}

export default function ShadowAIPage() {
  const { isAuthenticated, loading } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult | null>(null)
  const [filter, setFilter] = useState<'all' | 'HIGH' | 'MEDIUM' | 'LOW'>('all')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect handled by auth context
    }
  }, [loading, isAuthenticated])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await shadowAI.scan()
      setResults(res)
    } catch (e) {
      console.error('Scan failed', e)
    } finally {
      setScanning(false)
    }
  }

  const handleRemediate = async (findingId: string, action: 'block' | 'monitor' | 'whitelist') => {
    try {
      await shadowAI.remediate(findingId, action)
      // Refresh results
      handleScan()
    } catch (e) {
      console.error('Remediation failed', e)
    }
  }

  const filteredFindings = results?.findings.filter(f => 
    filter === 'all' || f.risk === filter
  ) || []

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-cyan-400" />
            Shadow AI Scanner
          </h1>
          <p className="text-gray-400 mt-2">
            Discover unauthorized AI tools and services in your environment
          </p>
        </div>

        {/* Scan Button & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="col-span-1 md:col-span-4">
            <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Scan for Shadow AI</h2>
                <p className="text-gray-400 text-sm">
                  Detects unauthorized LLM usage, AI extensions, and ungoverned AI services
                </p>
              </div>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-medium rounded-lg transition-colors"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Run Scan
                  </>
                )}
              </button>
            </div>
          </div>

          {results && (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span className="text-gray-400">Total Findings</span>
                </div>
                <div className="text-3xl font-bold">{results.summary.total}</div>
              </div>
              <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-gray-400">High Risk</span>
                </div>
                <div className="text-3xl font-bold text-red-400">{results.summary.highRisk}</div>
              </div>
              <div className="bg-gray-900 border border-yellow-900/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400">Medium Risk</span>
                </div>
                <div className="text-3xl font-bold text-yellow-400">{results.summary.mediumRisk}</div>
              </div>
              <div className="bg-gray-900 border border-green-900/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400">Low Risk</span>
                </div>
                <div className="text-3xl font-bold text-green-400">{results.summary.lowRisk}</div>
              </div>
            </>
          )}
        </div>

        {/* Filter */}
        {results && (
          <div className="flex gap-2 mb-6">
            {(['all', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? f === 'all' ? 'bg-cyan-500 text-slate-900'
                    : f === 'HIGH' ? 'bg-red-500 text-white'
                    : f === 'MEDIUM' ? 'bg-yellow-500 text-slate-900'
                    : 'bg-green-500 text-slate-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        )}

        {/* Findings List */}
        {filteredFindings.length > 0 && (
          <div className="space-y-4">
            {filteredFindings.map(finding => (
              <div
                key={finding.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {finding.risk === 'HIGH' ? (
                      <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    ) : finding.risk === 'MEDIUM' ? (
                      <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{finding.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          finding.risk === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          finding.risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {finding.risk}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                          {finding.type}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{finding.description}</p>
                      {finding.url && (
                        <p className="text-gray-500 text-xs mt-1">{finding.url}</p>
                      )}
                      <p className="text-cyan-400 text-sm mt-2">
                        <strong>Recommendation:</strong> {finding.recommendation}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemediate(finding.id, 'monitor')}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      Monitor
                    </button>
                    <button
                      onClick={() => handleRemediate(finding.id, 'whitelist')}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-green-400 text-sm rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    {finding.risk === 'HIGH' && (
                      <button
                        onClick={() => handleRemediate(finding.id, 'block')}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!results && (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Run a scan to discover Shadow AI usage</p>
          </div>
        )}
      </main>
    </div>
  )
}