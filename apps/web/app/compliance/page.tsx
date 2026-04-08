import { Shield, Lock, Eye, FileText, CheckCircle } from "lucide-react"

export default function Compliance() {
  const certifications = [
    { name: "SOC 2 Type II", status: "In Progress", icon: Shield },
    { name: "HIPAA Compliant", status: "Ready", icon: CheckCircle },
    { name: "GDPR Compliant", status: "Ready", icon: CheckCircle },
    { name: "PCI DSS", status: "In Progress", icon: Shield },
    { name: "ISO 27001", status: "Planned", icon: Shield },
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
            <a href="/" className="text-slate-400 hover:text-primary transition-colors">Home</a>
            <a href="/dashboard" className="text-slate-400 hover:text-primary transition-colors">Dashboard</a>
            <a href="/scan" className="text-slate-400 hover:text-primary transition-colors">Scanner</a>
            <a href="/pricing" className="text-slate-400 hover:text-primary transition-colors">Pricing</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Compliance & <span className="text-primary">Legal</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Zyra is built with security and privacy at its core. We're committed to meeting the highest industry standards.
          </p>
        </div>

        {/* Compliance Status */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Compliance Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <cert.icon className={`w-8 h-8 ${cert.status === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    cert.status === 'Ready' 
                      ? 'bg-emerald-400/10 text-emerald-400' 
                      : 'bg-amber-400/10 text-amber-400'
                  }`}>
                    {cert.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{cert.name}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* HIPAA Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-3xl p-8">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500/20 p-4 rounded-2xl">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">HIPAA Compliance</h2>
                <p className="text-slate-300 mb-6">
                  Zyra is designed to comply with the Health Insurance Portability and Accountability Act (HIPAA). 
                  Our platform implements all required administrative, physical, and technical safeguards to protect 
                  protected health information (PHI).
                </p>
                <h3 className="text-lg font-semibold mb-3">What this means for you:</h3>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> Data encrypted at rest and in transit
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> Access controls and audit logging
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> Business Associate Agreements (BAA) available
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> Regular security assessments
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* GDPR Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-8">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/20 p-4 rounded-2xl">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">GDPR Compliance</h2>
                <p className="text-slate-300 mb-6">
                  Zyra complies with the General Data Protection Regulation (GDPR) for organizations handling 
                  EU citizens' data. We implement data minimization, purpose limitation, and right to erasure.
                </p>
                <h3 className="text-lg font-semibold mb-3">Your rights under GDPR:</h3>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" /> Right to access your data
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" /> Right to data portability
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" /> Right to be forgotten
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" /> Data processing agreements
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Security Features */}
        <section>
          <h2 className="text-2xl font-bold mb-8">Security & Privacy Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <Lock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Encryption</h3>
              <p className="text-slate-400">AES-256 encryption at rest, TLS 1.3 in transit. All data encrypted regardless of storage location.</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <Eye className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Audit Logging</h3>
              <p className="text-slate-400">Comprehensive audit logs for all access and actions. Available for compliance reporting.</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <FileText className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Data Retention</h3>
              <p className="text-slate-400">Configurable data retention policies. Auto-delete after defined period or on demand.</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <Shield className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Controls</h3>
              <p className="text-slate-400">Role-based access control (RBAC). Multi-factor authentication supported.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-500 text-sm">
          <p>© 2026 Zyra — The Snake Shield 🛡️ | <a href="/privacy" className="hover:text-primary">Privacy Policy</a> | <a href="/terms" className="hover:text-primary">Terms of Service</a></p>
        </div>
      </footer>
    </div>
  )
}