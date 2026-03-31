"use client";

import {
  Shield,
  Zap,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  Star,
  Mail,
  Phone,
  MapPin,
  Lock,
  Workflow,
  Radar,
  Users,
  CircleHelp,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

const logoUrl = "/zyra-logo.png";

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Why Zyra", href: "#why-zyra" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const trustItems = ["Security teams", "SaaS startups", "Growth companies", "Enterprise operations"];

const features = [
  {
    icon: Shield,
    title: "Unified Threat Visibility",
    description:
      "Monitor vulnerabilities, incidents, asset risk, and operational signals from one clean command layer.",
  },
  {
    icon: Workflow,
    title: "Workflow-Driven Response",
    description:
      "Move from alert to action with structured triage, ownership, remediation, and verification workflows.",
  },
  {
    icon: BarChart3,
    title: "Executive-Ready Reporting",
    description:
      "Turn security noise into metrics, summaries, and reporting your leadership team can understand fast.",
  },
];

const solutions = [
  { icon: Radar, label: "Incident response management" },
  { icon: Zap, label: "Vulnerability lifecycle tracking" },
  { icon: Shield, label: "Risk register and prioritization" },
  { icon: Workflow, label: "Security workflow automation" },
  { icon: Lock, label: "Asset and exposure visibility" },
  { icon: Users, label: "Team collaboration and accountability" },
];

const stats = [
  { value: "24/7", label: "Operational visibility" },
  { value: "<5 min", label: "Faster triage routing" },
  { value: "1 hub", label: "Unified security workflows" },
  { value: "99.9%", label: "Platform uptime target" },
];

const pricing = [
  {
    name: "Starter",
    price: "$99",
    detail: "For early teams building a repeatable security workflow.",
    features: ["Core monitoring", "Incident tracking", "Risk views", "Email support"],
    featured: false,
  },
  {
    name: "Growth",
    price: "$299",
    detail: "For scaling teams that need automation, reporting, and collaboration.",
    features: ["Workflow automation", "Team seats", "Dashboards", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    detail: "For organizations that need custom onboarding, integrations, and advanced support.",
    features: ["Custom integrations", "Dedicated onboarding", "Advanced controls", "Enterprise support"],
    featured: false,
  },
];

const testimonials = [
  {
    quote: "Zyra gives our team one place to manage incidents, prioritize risk, and communicate clearly with leadership.",
    name: "Jordan Lee",
    role: "Security Operations Lead",
  },
  {
    quote: "The workflow structure is what stands out. It feels modern, clean, and designed for fast-moving teams.",
    name: "Avery Brooks",
    role: "Startup CTO",
  },
  {
    quote: "We needed a product that looked enterprise-ready from day one. Zyra gives us that confidence.",
    name: "Taylor Morgan",
    role: "Founder, B2B SaaS",
  },
];

const faqs = [
  {
    question: "Who is Zyra built for?",
    answer: "Zyra is designed for startups, growth-stage companies, and enterprise teams that need a cleaner way to manage risk, incidents, and security operations.",
  },
  {
    question: "Does Zyra replace existing security tools?",
    answer: "Zyra is positioned as an operational layer that helps teams centralize visibility, structure workflows, and improve decision-making across security activity.",
  },
  {
    question: "Can Zyra support enterprise onboarding?",
    answer: "Yes. The Enterprise plan is intended for organizations that need custom onboarding, tailored support, and integration planning.",
  },
  {
    question: "How does Zyra make money?",
    answer: "Zyra uses a SaaS business model with recurring subscription revenue, plus optional onboarding, implementation, and enterprise service enhancements.",
  },
];

function BrandMark({ size = "md", rounded = "rounded-2xl", className = "" }: { size?: string; rounded?: string; className?: string }) {
  const [imageLoaded, setImageLoaded] = useState(true);

  const sizeClasses: Record<string, string> = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  };

  return (
    <div className={`flex ${sizeClasses[size]} items-center justify-center overflow-hidden ${rounded} border border-white/10 bg-white/5 shadow-[0_0_35px_rgba(34,211,238,0.18)] ${className}`}>
      {imageLoaded ? (
        <img src={logoUrl} alt="Zyra logo" className="h-full w-full object-cover" onError={() => setImageLoaded(false)} />
      ) : (
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-lg font-black text-transparent">Z</span>
      )}
    </div>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <BrandMark size={compact ? "sm" : "md"} rounded={compact ? "rounded-xl" : "rounded-2xl"} />
      <div>
        <div className={`${compact ? "text-base" : "text-lg"} font-black tracking-[0.28em] text-white`}>ZYRA</div>
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Cybersecurity Operations</div>
      </div>
    </div>
  );
}

function GlowBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
      <BrandMark size="sm" rounded="rounded-full" className="border-cyan-300/20" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">{copy}</p>
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  const panelId = useId();

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 backdrop-blur-xl">
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" aria-expanded={isOpen} aria-controls={panelId as string}>
        <span className="text-base font-bold text-white md:text-lg">{question}</span>
        <span className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">{isOpen ? <X size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {isOpen && <div id={panelId as string} className="px-6 pb-6 text-sm leading-7 text-slate-400">{answer}</div>}
    </div>
  );
}

function NavLink({ href, children, onClick, className = "" }: { href: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

function TestimonialCard({ item }: { item: { quote: string; name: string; role: string } }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <BrandMark size="sm" rounded="rounded-xl" />
        <div className="flex gap-1 text-cyan-300">
          <Star size={16} fill="currentColor" />
          <Star size={16} fill="currentColor" />
          <Star size={16} fill="currentColor" />
          <Star size={16} fill="currentColor" />
          <Star size={16} fill="currentColor" />
        </div>
      </div>
      <p className="text-base leading-7 text-slate-300">"{item.quote}"</p>
      <div className="mt-6">
        <div className="font-bold text-white">{item.name}</div>
        <div className="text-sm text-slate-500">{item.role}</div>
      </div>
    </div>
  );
}

export default function ZyraLandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -left-24 top-56 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <a href="#top" className="flex items-center gap-4">
            <BrandLockup />
          </a>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            {navItems.map((item) => (
              <NavLink key={item.label} href={item.href} className="transition hover:text-white">{item.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/5">Book Demo</button>
            <button type="button" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.35)] transition hover:scale-[1.02]">Start Free Trial</button>
          </div>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 lg:hidden" onClick={() => setMobileOpen((prev) => !prev)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-white/10 bg-slate-950/95 px-6 py-5 lg:hidden">
            <div className="flex flex-col gap-4 text-sm text-slate-300">
              {navItems.map((item) => (
                <NavLink key={item.label} href={item.href} className="rounded-xl px-2 py-2 hover:bg-white/5" onClick={() => setMobileOpen(false)}>{item.label}</NavLink>
              ))}
              <button type="button" className="mt-2 rounded-full border border-white/15 px-4 py-3 font-semibold text-white">Book Demo</button>
              <button type="button" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 font-bold text-slate-950">Start Free Trial</button>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="max-w-2xl">
            <GlowBadge>Market-ready cybersecurity SaaS</GlowBadge>
            <h1 className="mt-7 text-5xl font-black leading-[0.92] tracking-tight text-white md:text-6xl lg:text-7xl">
              Modern security operations
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">for teams that need speed</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 md:text-xl">
              Zyra helps businesses detect threats, manage vulnerabilities, coordinate incident response, and reduce operational chaos with a clean, scalable security platform.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button type="button" className="rounded-full bg-white px-6 py-3.5 font-bold text-slate-950 transition hover:scale-[1.02]">Get Started</button>
              <button type="button" className="rounded-full border border-white/15 bg-white/5 px-6 py-3.5 font-bold text-white backdrop-blur transition hover:border-cyan-300/30 hover:bg-white/10">View Platform Tour</button>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <div key={item} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur">{item}</div>
              ))}
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-fuchsia-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <BrandMark size="sm" rounded="rounded-2xl" />
                  <div>
                    <div className="text-sm font-bold text-slate-100">Zyra Command Center</div>
                    <div className="text-xs text-slate-500">Live security operations overview</div>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Secure</div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Active Risks</div>
                  <div className="mt-4 text-4xl font-black text-white">18</div>
                  <div className="mt-2 text-sm text-emerald-300">Down 12% from last cycle</div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Open Incidents</div>
                  <div className="mt-4 text-4xl font-black text-white">4</div>
                  <div className="mt-2 text-sm text-cyan-300">2 triage, 2 remediation</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
