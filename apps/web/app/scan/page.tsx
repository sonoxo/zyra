'use client'

import { useState } from 'react'

interface ScanResult {
  reportId: string
  summary: {
    score: number
    riskLevel: string
    status: string
    asset: string
    vulnerabilities: {
      critical: number
      high: number
      medium: number
      low: number
    } | null
  }
  watermarked: boolean
  scannedBy: string
}

export default function ScanPage() {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setScanning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/public/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error || 'Scan failed')
        setScanning(false)
        return
      }

      // Poll for results
      const reportId = data.data.scanId
      const reportUrl = `/api/public/report/${data.data.reportToken}`
      
      // Wait for scan to complete
      await new Promise(r => setTimeout(r, 4000))
      
      const reportRes = await fetch(reportUrl)
      const reportData = await reportRes.json()
      
      if (reportData.success) {
        setResult(reportData.data)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setScanning(false)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score < 50) return 'text-red-600'
    if (score < 70) return 'text-orange-500'
    if (score < 85) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-6">
            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Free Security Scan
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Scan your app for vulnerabilities — instant results, shareable reports.
            <span className="block mt-2 text-cyan-400">Powered by AI security analysis</span>
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
          <form onSubmit={handleScan} className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com"
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={scanning}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-slate-900 font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {scanning && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 text-cyan-400">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-lg">Analyzing {url} for vulnerabilities...</span>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Scan Complete</h3>
                  <p className="text-slate-400">{result.summary.asset}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl border ${getRiskColor(result.summary.riskLevel)}`}>
                  <span className="font-semibold">{result.summary.riskLevel} RISK</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                  <h4 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Security Score</h4>
                  <div className={`text-5xl font-bold ${getScoreColor(result.summary.score)}`}>
                    {result.summary.score}
                    <span className="text-2xl text-slate-500">/100</span>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                  <h4 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Vulnerabilities</h4>
                  {result.summary.vulnerabilities ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-400">{result.summary.vulnerabilities.critical} Critical</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-orange-400">{result.summary.vulnerabilities.high} High</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-yellow-400">{result.summary.vulnerabilities.medium} Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-blue-400">{result.summary.vulnerabilities.low} Low</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">Scanning...</p>
                  )}
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  {result.scannedBy}
                </div>
                <button className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors">
                  Share Report
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Instant Results</h3>
            <p className="text-slate-400 text-sm">Get your security score in seconds, not hours.</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">AI-Powered</h3>
            <p className="text-slate-400 text-sm">Advanced ML models trained on real vulnerabilities.</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Share Reports</h3>
            <p className="text-slate-400 text-sm">Share results with your team or publicly.</p>
          </div>
        </div>
      </div>
    </div>
  )
}