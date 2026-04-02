"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Plus, Users, Lock, ArrowRight, Check, Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { orgs, assets, scans } from "../../lib/api"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState("")
  const [assetUrl, setAssetUrl] = useState("")
  const [assetType, setAssetType] = useState("WEBSITE")
  const [submitting, setSubmitting] = useState(false)
  const [orgsList, setOrgsList] = useState<any[]>([])

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
      setOrgsList(data || [])
      if (data && data.length > 0) {
        router.push("/dashboard")
      }
    } catch (e) {
      console.error("Failed to load orgs", e)
    }
  }

  async function createOrg() {
    if (!orgName.trim()) return
    setSubmitting(true)
    try {
      await orgs.create(orgName)
      setStep(2)
    } catch (e) {
      console.error("Failed to create org", e)
    } finally {
      setSubmitting(false)
    }
  }

  async function addAsset() {
    if (!assetUrl.trim()) return
    setSubmitting(true)
    try {
      await assets.create({ name: assetUrl, type: assetType, url: assetUrl })
      setStep(3)
    } catch (e) {
      console.error("Failed to add asset", e)
    } finally {
      setSubmitting(false)
    }
  }

  async function runQuickScan() {
    setSubmitting(true)
    try {
      await scans.create("QUICK")
      router.push("/dashboard?onboarding=complete")
    } catch (e) {
      console.error("Failed to run scan", e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  const steps = [
    { id: 1, title: "Create Organization", icon: Shield },
    { id: 2, title: "Add First Asset", icon: Lock },
    { id: 3, title: "Run First Scan", icon: Plus },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <Shield className="w-10 h-10 text-cyan-400" />
          <span className="text-2xl font-bold">Zyra</span>
        </div>

        <div className="flex items-center justify-center space-x-4 mb-12">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center space-x-2 ${step >= s.id ? 'text-cyan-400' : 'text-gray-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step > s.id ? 'border-cyan-400 bg-cyan-400/20' : step === s.id ? 'border-cyan-400' : 'border-gray-700'
                }`}>
                  {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-700 mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-2">Create Your Organization</h1>
              <p className="text-gray-400 mb-6">Organization groups your team, assets, and security data.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Company"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={createOrg}
                  disabled={submitting || !orgName.trim()}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Organization"}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-2">Add Your First Asset</h1>
              <p className="text-gray-400 mb-6">An asset is anything you want to protect: website, API, server, etc.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="API">API</option>
                    <option value="SERVER">Server</option>
                    <option value="DATABASE">Database</option>
                    <option value="CONTAINER">Container</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">URL / Address</label>
                  <input
                    type="text"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={addAsset}
                  disabled={submitting || !assetUrl.trim()}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Asset"}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-2">Run Your First Scan</h1>
              <p className="text-gray-400 mb-6">Start protecting your assets with an instant security scan.</p>
              
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-400 mb-2">Scan Type</div>
                <div className="text-lg font-medium text-white">Quick Scan</div>
                <div className="text-sm text-gray-500">Fast vulnerability check</div>
              </div>
              
              <button
                onClick={runQuickScan}
                disabled={submitting}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Quick Scan"}
              </button>
              
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
