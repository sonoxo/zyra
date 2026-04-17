'use client'

import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, XCircle, FileText, Download, RefreshCw, Activity, Lock, Globe } from 'lucide-react'
import { useAuth } from "../../context/AuthContext"
import { compliance } from '@/lib/api'

interface Framework {
  id: string
  name: string
  score: number
  status: 'compliant' | 'needs_attention' | 'non_compliant'
}

interface Control {
  id: string
  name: string
  status: 'PASS' | 'FAIL' | 'PENDING' | 'N/A'
  evidence?: string
  lastChecked: string
}

interface Report {
  framework: string
  score: number
  totalControls: number
  passedControls: number
  failedControls: number
  pendingControls: number
  generatedAt: string
  controls: Control[]
  summary: string
  recommendations: string[]
}

export default function CompliancePage() {
  const { isAuthenticated, loading } = useAuth()
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [selectedFramework, setSelectedFramework] = useState<string>('SOC2')
  const [report, setReport] = useState<Report | null>(null)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect handled by auth
    }
  }, [loading, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadFrameworks()
    }
  }, [isAuthenticated])

  async function loadFrameworks() {
    try {
      const data = await compliance.getFrameworks()
      // Set initial frameworks with mock scores
      setFrameworks([
        { id: 'SOC2', name: 'SOC 2 Type II', score: 85, status: 'compliant' },
        { id: 'PCI', name: 'PCI DSS', score: 72, status: 'needs_attention' },
        { id: 'HIPAA', name: 'HIPAA', score: 90, status: 'compliant' },
        { id: 'ISO27001', name: 'ISO 27001', score: 68, status: 'needs_attention' },
      ])
    } catch (e) {
      console.error('Failed to load frameworks', e)
    }
  }

  async function generateReport() {
    setGenerating(true)
    try {
      const res = await compliance.generateReport(selectedFramework)
      setReport(res.report)
    } catch (e) {
      console.error('Failed to generate report', e)
    } finally {
      setGenerating(false)
    }
  }

  async function exportReport(format: 'pdf' | 'json') {
    setExporting(true)
    try {
      const res = await compliance.exportReport(selectedFramework, format)
      alert(`Report ready! Download: ${res.downloadUrl}`)
    } catch (e) {
      console.error('Failed to export', e)
    } finally {
      setExporting(false)
    }
  }

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
            <Lock className="w-8 h-8 text-cyan-400" />
            Compliance Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            Generate and track compliance reports for SOC 2, PCI DSS, HIPAA, and ISO 27001
          </p>
        </div>

        {/* Framework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {frameworks.map(fw => (
            <div 
              key={fw.id}
              className={`bg-gray-900 border rounded-xl p-6 cursor-pointer transition-all ${
                selectedFramework === fw.id ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-gray-800 hover:border-gray-700'
              }`}
              onClick={() => setSelectedFramework(fw.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <Globe className="w-6 h-6 text-cyan-400" />
                <span className={`text-2xl font-bold ${
                  fw.score >= 80 ? 'text-green-400' : fw.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {fw.score}%
                </span>
              </div>
              <h3 className="font-semibold">{fw.name}</h3>
              <p className={`text-sm mt-1 ${
                fw.status === 'compliant' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {fw.status === 'compliant' ? 'Compliant' : 'Needs Attention'}
              </p>
            </div>
          ))}
        </div>

        {/* Generate Report Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                {selectedFramework} Compliance Report
              </h2>
              <p className="text-gray-400 text-sm">
                Generate a detailed compliance report with controls assessment
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={generateReport}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-medium rounded-lg transition-colors"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
              <button
                onClick={() => exportReport('pdf')}
                disabled={!report || exporting}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => exportReport('json')}
                disabled={!report || exporting}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* Report Results */}
        {report && (
          <>
            {/* Score Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Compliance Score</div>
                <div className={`text-3xl font-bold ${
                  report.score >= 80 ? 'text-green-400' : report.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {report.score}%
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Controls Passed</div>
                <div className="text-3xl font-bold text-green-400">{report.passedControls}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Controls Failed</div>
                <div className="text-3xl font-bold text-red-400">{report.failedControls}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Pending Review</div>
                <div className="text-3xl font-bold text-yellow-400">{report.pendingControls}</div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <p className="text-gray-300">{report.summary}</p>
              
              {report.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-cyan-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Controls List */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Control Details</h3>
              <div className="space-y-3">
                {report.controls.map(ctrl => (
                  <div 
                    key={ctrl.id}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {ctrl.status === 'PASS' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : ctrl.status === 'FAIL' ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      )}
                      <div>
                        <span className="font-medium">{ctrl.id}</span>
                        <span className="text-gray-400 ml-2">{ctrl.name}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      ctrl.status === 'PASS' ? 'bg-green-500/20 text-green-400' :
                      ctrl.status === 'FAIL' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {ctrl.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}