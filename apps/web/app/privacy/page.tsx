export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-white">
      <header className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold gradient-text">Zyra</span>
          </div>
          <nav className="flex space-x-8 text-sm">
            <a href="/" className="text-slate-400 hover:text-primary">Home</a>
            <a href="/compliance" className="text-slate-400 hover:text-primary">Compliance</a>
            <a href="/terms" className="text-slate-400 hover:text-primary">Terms</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-400 mb-4">Last updated: April 8, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>Zyra ("we", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cybersecurity platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal information (name, email, company)</li>
              <li>Authentication data (for secure access)</li>
              <li>Scan results and vulnerability data</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our security services</li>
              <li>Notify you of security vulnerabilities and threats</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. HIPAA & GDPR Compliance</h2>
            <p>Zyra is designed to comply with HIPAA and GDPR regulations. We implement appropriate technical and organizational measures to ensure the security of your data, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Encryption of data at rest and in transit</li>
              <li>Access controls and authentication</li>
              <li>Audit logging and monitoring</li>
              <li>Regular security assessments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing</h2>
            <p>We do not sell your data. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers who assist us</li>
              <li>Legal authorities when required by law</li>
              <li>Business associates under BAA (for HIPAA)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Data portability</li>
              <li>Object to processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Contact Us</h2>
            <p>For privacy concerns, contact us at: <span className="text-primary">privacy@zyra.host</span></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-20 py-8 text-center text-slate-500 text-sm">
        <p>© 2026 Zyra — The Snake Shield 🛡️</p>
      </footer>
    </div>
  )
}