import { Shield, Lock, Eye, Activity, ArrowRight, CheckCircle, Zap, Rocket } from "lucide-react"

export default function Home() {
  const features = [
    { icon: Shield, title: "Unified Threat Visibility", desc: "Monitor vulnerabilities, incidents, and assets from one command layer" },
    { icon: Lock, title: "Automated Response", desc: "AI-driven containment and remediation" },
    { icon: Eye, title: "Real-time Monitoring", desc: "24/7 threat detection with WebSocket updates" },
    { icon: Activity, title: "Security Score", desc: "Instant 0-100 scoring with actionable insights" },
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
            <a href="/scan" className="text-slate-400 hover:text-primary transition-colors duration-200">Scan</a>
            <a href="/pricing" className="text-slate-400 hover:text-primary transition-colors duration-200">Pricing</a>
            <a href="/dashboard" className="text-slate-400 hover:text-primary transition-colors duration-200">Dashboard</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6 animate-fade-in">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Security</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-slide-up">
            AI-Native <span className="text-primary drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">Cybersecurity</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Protect your organization with autonomous threat detection, automated response, and real-time security scoring.
          </p>
          
          <div className="flex justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a href="/dashboard" className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primaryGlow text-background font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a href="/scan" className="inline-flex items-center px-6 py-3 bg-surfaceElevated hover:bg-surface border border-border hover:border-primary/50 text-white font-semibold rounded-xl transition-all duration-200">
              Free Scan
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-0.5">
                <feature.icon className="w-8 h-8 text-primary mb-4 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Rocket className="w-4 h-4 text-primary" />
            <span>Ready to secure your organization?</span>
          </div>
          <br />
          <a href="/dashboard" className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primaryGlow text-background font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]">
            Start Free Trial
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-500 text-sm">
          <p>© 2026 Zyra. Built for the future of security.</p>
        </div>
      </footer>
    </div>
  )
}