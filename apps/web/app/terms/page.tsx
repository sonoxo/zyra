export default function Terms() {
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
            <a href="/privacy" className="text-slate-400 hover:text-primary">Privacy</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-slate-400 mb-4">Last updated: April 8, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using Zyra, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p>Zyra is an AI-native cybersecurity platform providing vulnerability scanning, threat detection, and security monitoring services. The service includes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Web vulnerability scanning</li>
              <li>Privacy and PII detection (via HoundDog)</li>
              <li>Security alert monitoring</li>
              <li>Compliance reporting (HIPAA, GDPR)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Acceptable Use</h2>
            <p>You agree to use Zyra only for lawful purposes. You may NOT:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Scan websites without authorization</li>
              <li>Use the service for illegal activities</li>
              <li>Attempt to circumvent security measures</li>
              <li>Share your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Legal Compliance</h2>
            <p>You are responsible for ensuring your use of Zyra complies with applicable laws, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Computer Fraud and Abuse Act (CFAA)</li>
              <li>GDPR (if processing EU data)</li>
              <li>HIPAA (if processing healthcare data)</li>
              <li>Local laws and regulations</li>
            </ul>
            <p className="mt-4 text-amber-400">⚠️ <strong>Important:</strong> Always obtain proper authorization before scanning any website or system. Unauthorized scanning is illegal and may constitute a criminal offense.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p>Zyra provides services "AS IS" without warranties of any kind. We are not liable for:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Accuracy of scan results</li>
              <li>Damage from using the service</li>
              <li>Loss of data or business interruption</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Indemnification</h2>
            <p>You agree to indemnify and hold Zyra harmless from any claims, damages, or expenses arising from your use of the service or violation of these terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Contact</h2>
            <p>For questions about these terms, contact: <span className="text-primary">legal@zyra.host</span></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-20 py-8 text-center text-slate-500 text-sm">
        <p>© 2026 Zyra — The Snake Shield 🛡️</p>
      </footer>
    </div>
  )
}