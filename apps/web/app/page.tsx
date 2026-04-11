import { Shield, Lock, Eye, Activity, ArrowRight, CheckCircle, Zap, Rocket, Bot, Target, Zap as Lightning, Users, Globe } from "lucide-react"

export default function Home() {
  const capabilities = [
    { icon: Bot, title: "Agentic Investigation", desc: "AI agents autonomously investigate threats — triage, correlate, and verdict in seconds" },
    { icon: Lock, title: "Auto-Remediation", desc: "Isolate endpoints, quarantine emails, disable users — all without manual steps" },
    { icon: Eye, title: "Real-time Monitoring", desc: "24/7 alert ingestion from M365, Defender, CrowdStrike, and more" },
    { icon: Activity, title: "Security Score", desc: "Instant 0-100 scoring with actionable insights for every asset" },
  ]

  const comparison = [
    { label: "Target", zyra: "SMB & Mid-Market", legacy: "Enterprise only" },
    { label: "Onboarding", zyra: "< 5 minutes", legacy: "Weeks of setup" },
    { label: "Deployment", zyra: "Self-service", legacy: "Professional services" },
    { label: "Response", zyra: "Autonomous", legacy: "Analyst-driven" },
    { label: "Pricing", zyra: "Flat-rate", legacy: "Enterprise contracts" },
  ]

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span className="text-xl font-bold gradient-text">Zyra</span>
          </div>
          <nav className="flex space-x-8 text-sm">
            <a href="#platform" className="text-slate-400 hover:text-primary transition-colors">Platform</a>
            <a href="#differentiators" className="text-slate-400 hover:text-primary transition-colors">Why Zyra</a>
            <a href="/scan" className="text-slate-400 hover:text-primary transition-colors">Scanner</a>
            <a href="/dashboard" className="text-slate-400 hover:text-primary transition-colors">Dashboard</a>
            <a href="/compliance" className="text-slate-400 hover:text-primary transition-colors">Compliance</a>
            <a href="/resources" className="text-slate-400 hover:text-primary transition-colors">Resources</a>
            <a href="/pricing" className="text-slate-400 hover:text-primary transition-colors">Pricing</a>
            <a href="https://github.com/sonoxo/zyra/blob/main/SECURITY-CONTROLS.md" target="_blank" className="text-slate-400 hover:text-primary transition-colors">Trust Center</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>Enterprise-Grade Agentic Security</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Your Security <span className="text-primary drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">Co-Pilot</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Autonomous AI agents that investigate, correlate, and remediate threats — built for organizations that can't afford enterprise pricing.
          </p>
          
          <div className="flex justify-center gap-4">
            <a href="/dashboard" className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primaryGlow text-background font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              Start Free <Lightning className="ml-2 w-5 h-5" />
            </a>
            <a href="#platform" className="inline-flex items-center px-6 py-3 bg-surfaceElevated hover:bg-surface border border-border hover:border-primary/50 text-white font-semibold rounded-xl transition-all">
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="text-3xl font-bold text-primary">&lt;2min</div>
              <div className="text-slate-400 text-sm">Time to Investigate</div>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="text-3xl font-bold text-primary">85%</div>
              <div className="text-slate-400 text-sm">False Positive Reduction</div>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-slate-400 text-sm">AI Agents</div>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-slate-400 text-sm">Uptime SLA</div>
            </div>
          </div>
        </section>

        {/* Platform - Meeting 7AI Standards */}
        <section id="platform" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built to 7AI Standards</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Every capability enterprise security teams rely on — now accessible to everyone.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <cap.icon className="w-8 h-8 text-primary mb-4 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                <h3 className="text-lg font-semibold mb-2">{cap.title}</h3>
                <p className="text-slate-400 text-sm">{cap.desc}</p>
              </div>
            ))}
          </div>

          {/* Integration Logos */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 items-center text-slate-500">
            <div className="flex items-center gap-2"><Globe className="w-5 h-5" /> Microsoft 365</div>
            <div className="flex items-center gap-2"><Shield className="w-5 h-5" /> Defender</div>
            <div className="flex items-center gap-2"><Target className="w-5 h-5" /> CrowdStrike</div>
            <div className="flex items-center gap-2"><Users className="w-5 h-5" /> Okta</div>
            <div className="flex items-center gap-2"><Activity className="w-5 h-5" /> AWS</div>
          </div>
        </section>

        {/* Why Zyra - Our Differentiators */}
        <section id="differentiators" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Zyra Wins</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              The enterprise capabilities of 7AI — at a fraction of the cost, built for how SMBs actually work.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-3xl overflow-hidden">
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-4 text-slate-400 font-medium text-center bg-surfaceElevated">Feature</div>
              <div className="p-4 text-primary font-bold text-center bg-primary/10">Zyra</div>
              <div className="p-4 text-slate-400 font-bold text-center bg-surfaceElevated">Legacy</div>
            </div>
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-border last:border-0">
                <div className="p-4 text-slate-300 text-center border-r border-border">{row.label}</div>
                <div className="p-4 text-primary text-center font-semibold border-r border-border bg-primary/5">{row.zyra}</div>
                <div className="p-4 text-slate-500 text-center">{row.legacy}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Proactive Protection */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-br from-primary/20 via-surface to-fuchsia-500/10 border border-primary/20 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Beyond Detection</h2>
                <p className="text-slate-300 mb-6">
                  Zyra doesn't just respond to threats — it prevents them. Our Desktop Companion educates users in real-time, turning every employee into a security asset.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-primary" /> Real-time phishing warnings
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-primary" /> Automated security training
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-primary" /> User risk scoring for leadership
                  </li>
                </ul>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-semibold">Zyra Guard</div>
                    <div className="text-slate-400 text-sm">Your desktop security companion</div>
                  </div>
                </div>
                <div className="text-sm text-slate-300 space-y-2">
                  <div className="bg-surfaceElevated rounded-lg p-3 border border-border">
                    <span className="text-cyan-300">⚠️</span> Suspicious link detected: "verify-account.xyz"
                  </div>
                  <div className="bg-surfaceElevated rounded-lg p-3 border border-border">
                    <span className="text-emerald-300">✓</span> Blocked before reaching browser
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Rocket className="w-4 h-4 text-primary" />
            <span>Enterprise security — built for everyone</span>
          </div>
          <br />
          <a href="/dashboard" className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primaryGlow text-background font-semibold rounded-xl transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]">
            Start Free Trial
          </a>
          <p className="text-slate-500 mt-4 text-sm">No credit card required · 14-day free trial</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-500 text-sm">
          <p>© 2026 Zyra — The Snake Shield 🛡️</p>
        </div>
      </footer>
    </div>
  )
}