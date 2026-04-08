'use client'

import { useState } from 'react'

interface ScanResult {
  score: number
  riskLevel: string
  vulnerabilities: { critical: number; high: number; medium: number; low: number }
  findings: Array<{ severity: string; title: string; description: string }>
}

export default function ScanDemo() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)

  const handleScan = async () => {
    if (!url) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('http://localhost:3001/api/public/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      setResult(data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🛡️ Security Scanner Demo</h1>
        
        <div className="flex gap-4 mb-8">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white"
          />
          <button
            onClick={handleScan}
            disabled={loading || !url}
            className="bg-primary hover:bg-primaryGlow text-background font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {result && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm">Security Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}/100
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Risk Level</p>
                <p className={`text-xl font-bold ${
                  result.riskLevel === 'CRITICAL' ? 'text-red-400' :
                  result.riskLevel === 'HIGH' ? 'text-orange-400' :
                  result.riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {result.riskLevel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
              <div className="bg-surfaceElevated p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{result.vulnerabilities.critical}</p>
                <p className="text-xs text-slate-400">Critical</p>
              </div>
              <div className="bg-surfaceElevated p-3 rounded-lg">
                <p className="text-2xl font-bold text-orange-400">{result.vulnerabilities.high}</p>
                <p className="text-xs text-slate-400">High</p>
              </div>
              <div className="bg-surfaceElevated p-3 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{result.vulnerabilities.medium}</p>
                <p className="text-xs text-slate-400">Medium</p>
              </div>
              <div className="bg-surfaceElevated p-3 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{result.vulnerabilities.low}</p>
                <p className="text-xs text-slate-400">Low</p>
              </div>
            </div>

            {result.findings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Findings</h3>
                <div className="space-y-2">
                  {result.findings.map((f, i) => (
                    <div key={i} className="bg-surfaceElevated p-3 rounded-lg flex items-start gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        f.severity === 'critical' ? 'bg-red-400/20 text-red-400' :
                        f.severity === 'high' ? 'bg-orange-400/20 text-orange-400' :
                        'bg-yellow-400/20 text-yellow-400'
                      }`}>
                        {f.severity.toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">{f.title}</p>
                        <p className="text-sm text-slate-400">{f.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
