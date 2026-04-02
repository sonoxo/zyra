'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, ArrowRight, Lock, Share2, ExternalLink } from 'lucide-react'

interface ReportData {
  reportId: string
  summary: {
    score: number
    riskLevel: string
    status: string
    asset: string
    type: string
    vulnerabilities: {
      critical: number
      high: number
      medium: number
      low: number
    } | null
    scannedAt: string
  }
  watermarked: boolean
  scannedBy: string
}

export default function ReportPage() {
  const params = useParams()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const id = params.id as string
        const res = await fetch(`/api/public/report/${id}`)
        const data = await res.json()
        
        if (data.success) {
          setReport(data.data)
        } else {
          setError(data.error || 'Report not found')
        }
      } catch (err: any) {
        setError(err.message)
      }
      setLoading(false)
    }

    if (params.id) {
      fetchReport()
    }
  }, [params.id])

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/30'
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
      default: return 'text-green-500 bg-green-500/10 border-green-500/30'
    }
  }

  const getScoreColor = (score: number) => {
    if (score < 50) return 'text-red-500'
    if (score < 70) return 'text-orange-500'
    if (score < 85) return 'text-yellow-500'
    return 'text-green-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
          <p className="text-slate-400">This scan report may have expired.</p>
          <a href="/scan" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-cyan-500 text-slate-900 font-medium rounded-lg">
            Run New Scan <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xl font-bold text-white">Zyra</span>
          </div>
          <a href="/scan" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
            New Scan <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Report Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Asset Info */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="text-sm text-slate-400 mb-1">Scanned Asset</div>
            <div className="text-xl font-semibold text-white break-all">{report.summary.asset}</div>
            <div className="mt-2 text-xs text-slate-500">
              Scan type: {report.summary.type} • Scanned: {new Date(report.summary.scannedAt).toLocaleString()}
            </div>
          </div>

          {/* Score */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400 mb-2">Security Score</div>
                <div className={`text-6xl font-bold ${getScoreColor(report.summary.score)}`}>
                  {report.summary.score}
                  <span className="text-3xl text-slate-500">/100</span>
                </div>
              </div>
              <div className={`px-6 py-3 rounded-2xl border ${getRiskColor(report.summary.riskLevel)}`}>
                <div className="text-2xl font-bold">{report.summary.riskLevel}</div>
                <div className="text-sm text-slate-400">RISK LEVEL</div>
              </div>
            </div>
          </div>

          {/* Vulnerabilities */}
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Vulnerabilities
            </h3>
            {report.summary.vulnerabilities ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="text-3xl font-bold text-red-500">{report.summary.vulnerabilities.critical}</div>
                  <div className="text-sm text-red-400">Critical</div>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <div className="text-3xl font-bold text-orange-500">{report.summary.vulnerabilities.high}</div>
                  <div className="text-sm text-orange-400">High</div>
                </div>
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-500">{report.summary.vulnerabilities.medium}</div>
                  <div className="text-sm text-yellow-400">Medium</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-500">{report.summary.vulnerabilities.low}</div>
                  <div className="text-sm text-blue-400">Low</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Loading...</div>
            )}
          </div>

          {/* CTA */}
          <div className="p-6 bg-gradient-to-r from-cyan-500/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold mb-1">See Fix Recommendations</h4>
                <p className="text-slate-400 text-sm">Get detailed steps to fix each vulnerability</p>
              </div>
              <a href="/pricing" className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-xl flex items-center gap-2">
                Unlock Full Report <Lock className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Watermark */}
          <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Shield className="w-4 h-4" />
              {report.scannedBy}
            </div>
            <div className="text-slate-500 text-sm">
              Report ID: {report.reportId}
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Powered by Zyra — AI-Powered Security Scanning
          </p>
        </div>
      </div>
    </div>
  )
}