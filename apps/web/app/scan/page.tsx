'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, ArrowRight, Lock, Share2, ChevronRight } from 'lucide-react'

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
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setScanning(true)
    setError('')
    setResult(null)
    setShowUpgrade(false)
    setProgress(0)

    const startTime = Date.now()

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

      const scanId = data.data.scanId
      const reportToken = data.data.reportToken
      
      // Simulate progress in real-time (< 60 seconds total)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 500)

      // Poll for completion (max 30 seconds)
      let completed = false
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000))
        
        const reportRes = await fetch(`/api/public/report/${reportToken}`)
        const reportData = await reportRes.json()
        
        if (reportData.success && reportData.data.summary.status === 'COMPLETED') {
          completed = true
          setProgress(100)
          clearInterval(progressInterval)
          setResult(reportData.data)
          
          // Show upgrade if critical/high vulnerabilities found
          const vulns = reportData.data.summary.vulnerabilities
          if (vulns && (vulns.critical > 0 || vulns.high > 0)) {
            setShowUpgrade(true)
          }
          break
        }
      }

      clearInterval(progressInterval)
      
      if (!completed && !result) {
        // Still return partial results
        const reportRes = await fetch(`/api/public/report/${reportToken}`)
        const reportData = await reportRes.json()
        if (reportData.success) {
          setResult(reportData.data)
        }
      }
    } catch (err: any) {
      setError(err.message)
    }
    setScanning(false)
  }

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

  const copyShareLink = () => {
    if (result) {
      const link = `${window.location.origin}/report/${result.reportId}`
      navigator.clipboard.writeText(link)
      alert('Report link copied!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-4">
            <Zap className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Scan Your App in <span className="text-cyan-400">60 Seconds</span>
          </h1>
          <p className="text-slate-400">
            Instant security scan. No signup required.
          </p>
        </div>

        {/* Scan Form */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
          <form onSubmit={handleScan} className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com"
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={scanning}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-slate-900 font-semibold rounded-xl transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {scanning ? 'Scanning...' : 'Scan Now'}
              {!scanning && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {scanning && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300">Analyzing {url}</span>
              <span className="text-cyan-400 font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Checking SSL
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Analyzing headers
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Scanning vulnerabilities
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Score Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Security Score</div>
                  <div className={`text-5xl font-bold ${getScoreColor(result.summary.score)}`}>
                    {result.summary.score}
                    <span className="text-2xl text-slate-500">/100</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border ${getRiskColor(result.summary.riskLevel)}`}>
                  <span className="font-bold">{result.summary.riskLevel} RISK</span>
                </div>
              </div>
            </div>

            {/* Vulnerabilities */}
            <div className="p-6">
              <h3 className="text-white font-semibold mb-4">Vulnerabilities Found</h3>
              {result.summary.vulnerabilities ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border ${result.summary.vulnerabilities.critical > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-700/30 border-slate-700'}`}>
                    <div className="text-3xl font-bold text-red-500">{result.summary.vulnerabilities.critical}</div>
                    <div className="text-sm text-slate-400">Critical</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${result.summary.vulnerabilities.high > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-700/30 border-slate-700'}`}>
                    <div className="text-3xl font-bold text-orange-500">{result.summary.vulnerabilities.high}</div>
                    <div className="text-sm text-slate-400">High</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-700">
                    <div className="text-3xl font-bold text-yellow-500">{result.summary.vulnerabilities.medium}</div>
                    <div className="text-sm text-slate-400">Medium</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-700">
                    <div className="text-3xl font-bold text-blue-500">{result.summary.vulnerabilities.low}</div>
                    <div className="text-sm text-slate-400">Low</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Scanning...</div>
              )}
            </div>

            {/* CTA Sections */}
            <div className="border-t border-slate-700/50">
              {/* Show upgrade prompt if critical vulns found */}
              {showUpgrade && (
                <div className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-red-500/20">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">Critical Vulnerabilities Detected!</h4>
                      <p className="text-slate-400 text-sm mb-3">
                        Your app has critical security issues. Get detailed fix recommendations and continuous monitoring.
                      </p>
                      <a href="/pricing" className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg">
                        View Fixes <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign up CTA */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">Unlock Full Report</h4>
                    <p className="text-slate-400 text-sm">Get detailed vulnerability explanations and fix steps</p>
                  </div>
                  <a href="/dashboard" className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-xl flex items-center gap-2">
                    Sign Up Free <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Share */}
              <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Shield className="w-4 h-4" />
                  {result.scannedBy}
                </div>
                <button 
                  onClick={copyShareLink}
                  className="flex items-center gap-2 text-cyan-400 text-sm hover:text-cyan-300"
                >
                  <Share2 className="w-4 h-4" /> Share Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trust Signals */}
        <div className="mt-10 flex items-center justify-center gap-8 text-slate-500 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> No signup required
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Free forever
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Instant results
          </span>
        </div>
      </div>
    </div>
  )
}