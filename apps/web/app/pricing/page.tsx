'use client'

import { useState, useEffect } from 'react'
import { Check, Shield, Zap, Building, ArrowRight } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  features: {
    scans: number
    assets: number
    users: number
    prioritySupport: boolean
  }
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [loadingUpgrade, setLoadingUpgrade] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pricing/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPlans(data.data)
      })
      .finally(() => setLoading(false))

    // Get current user's plan
    fetch('/api/pricing/my-plan')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCurrentPlan(data.data.plan)
        }
      })
      .catch(() => {})
  }, [])

  const handleUpgrade = async (planId: string) => {
    setLoadingUpgrade(planId)
    try {
      const res = await fetch('/api/pricing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      
      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (err) {
      alert('Failed to upgrade')
    }
    setLoadingUpgrade(null)
  }

  const getFeatureValue = (value: number) => {
    return value === -1 ? 'Unlimited' : value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 mb-6">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your security needs. All plans include our AI-powered vulnerability scanning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* FREE */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Free</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-slate-400">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>{getFeatureValue(10)} scans/month</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>{getFeatureValue(5)} assets</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>Basic vulnerability reports</span>
              </li>
            </ul>
            <button
              disabled={currentPlan === 'FREE'}
              className="w-full py-3 bg-slate-700 text-slate-300 rounded-xl font-medium disabled:opacity-50"
            >
              {currentPlan === 'FREE' ? 'Current Plan' : 'Get Started'}
            </button>
          </div>

          {/* PRO */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-xl rounded-2xl border-2 border-cyan-500/50 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-slate-900 text-sm font-bold rounded-full">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Pro</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-slate-400">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>{getFeatureValue(100)} scans/month</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>{getFeatureValue(50)} assets</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>Continuous monitoring</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>Real-time alerts</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={loadingUpgrade === 'pro' || currentPlan === 'PRO'}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-slate-900 font-semibold rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingUpgrade === 'pro' ? (
                <span>Processing...</span>
              ) : currentPlan === 'PRO' ? (
                'Current Plan'
              ) : (
                <>
                  Upgrade to Pro <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* ENTERPRISE */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">Enterprise</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$199</span>
                <span className="text-slate-400">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>Unlimited scans</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>Unlimited assets</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>Unlimited team members</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>API access</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 shrink-0" />
                <span>Custom integrations</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('enterprise')}
              disabled={loadingUpgrade === 'enterprise' || currentPlan === 'ENTERPRISE'}
              className="w-full py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 disabled:border-slate-600 disabled:text-slate-500 rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
            >
              {loadingUpgrade === 'enterprise' ? 'Processing...' : 'Contact Sales'}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500">
            Need a custom plan? <span className="text-cyan-400 cursor-pointer hover:underline">Contact us</span> for enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  )
}