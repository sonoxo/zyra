import { BookOpen, Sparkles, Users, ArrowRight } from "lucide-react"

export default function Resources() {
  const guides = [
    { title: "Claude 101", desc: "Getting started with Claude AI", url: "https://ruben.substack.com/p/claude" },
    { title: "Claude Code", desc: "Build with Claude in your terminal", url: "https://ruben.substack.com/p/claude-code" },
    { title: "Claude Skills", desc: "Create custom AI workflows", url: "https://ruben.substack.com/p/claude-skills" },
    { title: "Claude for Teams", desc: "Scale AI across your organization", url: "https://ruben.substack.com/p/claude-for-teams" },
    { title: "AI for Search", desc: "Best AI tools for research", url: "https://ruben.substack.com/p/grok-420" },
    { title: "AI Slides", desc: "Create presentations with AI", url: "https://ruben.substack.com/p/powerpoint" },
    { title: "AI Interactive Charts", desc: "Build data visualizations", url: "https://ruben.substack.com/p/claude-charts" },
    { title: "AI Computer Use", desc: "Let AI control your computer", url: "https://ruben.substack.com/p/claude-computer" },
  ]

  const zyraGuides = [
    { title: "Getting Started with Zyra", desc: "Set up your first security scan in minutes", url: "/onboarding" },
    { title: "Understanding Vulnerability Reports", desc: "How to interpret scan results", url: "/scan" },
    { title: "Compliance Made Easy", desc: "Generate HIPAA, GDPR, and SOC 2 reports", url: "/compliance" },
    { title: "API Integration Guide", desc: "Connect Zyra with your existing tools", url: "https://github.com/sonoxo/zyra" },
  ]

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold gradient-text">Zyra</span>
          </div>
          <nav className="flex space-x-8 text-sm">
            <a href="/" className="text-slate-400 hover:text-primary transition-colors">Home</a>
            <a href="/scan" className="text-slate-400 hover:text-primary transition-colors">Scanner</a>
            <a href="/compliance" className="text-slate-400 hover:text-primary transition-colors">Compliance</a>
            <a href="/pricing" className="text-slate-400 hover:text-primary transition-colors">Pricing</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Resources & <span className="text-primary">Guides</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Learn how to leverage AI for security, and get the most out of Zyra.
          </p>
        </div>

        {/* AI Guides from Ruben Hassid */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">AI Learning Guides</h2>
          </div>
          <p className="text-slate-400 mb-8">
            Free guides by AI expert Ruben Hassid — master AI in hours, not months.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide, i) => (
              <a
                key={i}
                href={guide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/50 transition-all"
              >
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{guide.desc}</p>
                <div className="flex items-center text-primary text-sm">
                  Read guide <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Zyra-specific Guides */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">Zyra Tutorials</h2>
          </div>
          <p className="text-slate-400 mb-8">
            Get the most out of Zyra with these step-by-step guides.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zyraGuides.map((guide, i) => (
              <a
                key={i}
                href={guide.url}
                className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/50 transition-all"
              >
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>
                <p className="text-slate-400 text-sm">{guide.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="mt-16">
          <div className="bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/20 rounded-3xl p-8 text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Stay Ahead of Threats</h2>
            <p className="text-slate-300 mb-6 max-w-xl mx-auto">
              Subscribe to our newsletter for weekly security tips, AI insights, and Zyra updates.
            </p>
            <a
              href="http://how-to-ai.guide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primaryGlow text-background font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              Subscribe Free
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-500 text-sm">
          <p>© 2026 Zyra — The Snake Shield 🛡️ | <a href="/privacy" className="hover:text-primary">Privacy</a> | <a href="/terms" className="hover:text-primary">Terms</a></p>
        </div>
      </footer>
    </div>
  )
}