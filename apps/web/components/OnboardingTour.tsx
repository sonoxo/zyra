'use client'

import { useState, useEffect } from 'react'
import { useHelp } from '@/lib/help'

const ONBOARDING_STEPS = [
  {
    target: 'dashboard',
    title: 'Welcome to Zyra!',
    content: 'Your AI-powered security platform. This dashboard shows your security score, active threats, and compliance status at a glance.',
    position: 'center'
  },
  {
    target: 'score',
    title: 'Security Score',
    content: 'Your overall score (0-100). Click to see detailed breakdowns. Aim for 80+ to maintain strong security posture.',
    position: 'right'
  },
  {
    target: 'scan',
    title: 'Run Your First Scan',
    content: 'Click here to scan your assets. Zyra checks for vulnerabilities, misconfigurations, and compliance issues.',
    position: 'bottom'
  },
  {
    target: 'copilot',
    title: 'AI Copilot',
    content: 'Need help? Chat with Zyra AI. Ask about threats, remediation steps, or security best practices.',
    position: 'left'
  }
]

export function OnboardingTour() {
  const { isNewUser, dismissOnboarding } = useHelp()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isNewUser) {
      // Delay to let page render
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isNewUser])

  if (!isVisible) return null

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs text-cyan-400 uppercase tracking-wider">Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
            <h3 className="text-lg font-bold text-white mt-1">{step.title}</h3>
          </div>
          <button
            onClick={() => {
              dismissOnboarding()
              setIsVisible(false)
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <p className="text-slate-300 text-sm mb-6">{step.content}</p>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              dismissOnboarding()
              setIsVisible(false)
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(s => s - 1)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  dismissOnboarding()
                  setIsVisible(false)
                } else {
                  setCurrentStep(s => s + 1)
                }
              }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-medium rounded-lg text-sm transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-1 mt-4">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-cyan-400' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}