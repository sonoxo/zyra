import { Shield, Lock, Eye, Activity, ArrowRight, CheckCircle } from "lucide-react"

export default function Home() {
  const features = [
    { icon: Shield, title: "Unified Threat Visibility", desc: "Monitor vulnerabilities, incidents, and assets from one command layer" },
    { icon: Lock, title: "Automated Response", desc: "AI-driven containment and remediation" },
    { icon: Eye, title: "Real-time Monitoring", desc: "24/7 threat detection with WebSocket updates" },
    { icon: Activity, title: "Security Score", desc: "Instant 0-100 scoring with actionable insights" },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold">Zyra</span>
          </div>
          <nav className="flex space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white">Platform</a>
            <a href="#" className="hover:text-white">Solutions</a>
            <a href="#" className="hover:text-white">Pricing</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            AI-Native <span className="text-cyan-400">Cybersecurity</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Protect your organization with autonomous threat detection, automated response, and real-time security scoring.
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/dashboard" className="inline-flex items-center px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </a>
            <a href="#" className="inline-flex items-center px-6 py-3 border border-gray-700 hover:border-gray-600 rounded-lg font-medium">
              Request Demo
            </a>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition">
                <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to secure your organization?</h2>
          <a href="/dashboard" className="inline-flex items-center px-8 py-4 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium text-lg">
            Start Free Trial
          </a>
        </section>
      </main>

      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500 text-sm">
          <p>© 2026 Zyra. Built for the future of security.</p>
        </div>
      </footer>
    </div>
  )
}
