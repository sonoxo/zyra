import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Activity, Zap, Globe, AlertTriangle, Target,
  Radio, Wifi, Server, Lock, Flame, Eye, Play, Pause,
  TrendingUp, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreatEvent {
  id: string;
  timestamp: number;
  type: "intrusion" | "malware" | "ddos" | "phishing" | "exfiltration" | "bruteforce" | "exploit" | "recon";
  severity: "critical" | "high" | "medium" | "low";
  source: string;
  target: string;
  action: string;
  status: "blocked" | "detected" | "mitigated" | "investigating";
  country: string;
  protocol: string;
}

interface AttackNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "attacker" | "firewall" | "server" | "database" | "endpoint" | "cloud";
  status: "safe" | "under_attack" | "compromised" | "protected";
  pulsePhase: number;
}

interface AttackFlow {
  id: string;
  fromNode: string;
  toNode: string;
  progress: number;
  severity: "critical" | "high" | "medium" | "low";
  blocked: boolean;
  speed: number;
}

const THREAT_TYPES = [
  { type: "intrusion", label: "Intrusion Attempt", protocols: ["SSH", "RDP", "VNC", "Telnet"] },
  { type: "malware", label: "Malware Detected", protocols: ["HTTP", "HTTPS", "SMTP", "FTP"] },
  { type: "ddos", label: "DDoS Attack", protocols: ["UDP", "TCP SYN", "HTTP Flood", "DNS Amplification"] },
  { type: "phishing", label: "Phishing Campaign", protocols: ["SMTP", "HTTP", "HTTPS"] },
  { type: "exfiltration", label: "Data Exfiltration", protocols: ["HTTPS", "DNS Tunnel", "ICMP", "FTP"] },
  { type: "bruteforce", label: "Brute Force", protocols: ["SSH", "RDP", "HTTP Auth", "LDAP"] },
  { type: "exploit", label: "Exploit Attempt", protocols: ["HTTP", "SMB", "RPC", "WebSocket"] },
  { type: "recon", label: "Reconnaissance", protocols: ["ICMP", "TCP SYN", "DNS", "SNMP"] },
] as const;

const COUNTRIES = [
  "Russia", "China", "North Korea", "Iran", "Brazil", "United States",
  "Germany", "Ukraine", "Romania", "Nigeria", "India", "Turkey",
  "Vietnam", "Indonesia", "Pakistan", "Netherlands", "France"
];

const SOURCE_IPS = [
  "185.220.101.", "45.33.32.", "198.51.100.", "203.0.113.",
  "91.219.236.", "23.129.64.", "104.244.76.", "171.25.193.",
  "62.210.105.", "178.62.197.", "139.59.144.", "167.71.13."
];

const TARGET_SYSTEMS = [
  "Web Server (DMZ)", "API Gateway", "Auth Service", "Database Cluster",
  "Mail Server", "DNS Server", "Load Balancer", "Container Registry",
  "CI/CD Pipeline", "Storage Service", "VPN Gateway", "Identity Provider"
];

const SEVERITY_CONFIG = {
  critical: { color: "#ef4444", glow: "rgba(239,68,68,0.6)", bg: "bg-red-500/10 text-red-400", border: "border-red-500/30" },
  high: { color: "#f97316", glow: "rgba(249,115,22,0.5)", bg: "bg-orange-500/10 text-orange-400", border: "border-orange-500/30" },
  medium: { color: "#eab308", glow: "rgba(234,179,8,0.4)", bg: "bg-yellow-500/10 text-yellow-400", border: "border-yellow-500/30" },
  low: { color: "#3b82f6", glow: "rgba(59,130,246,0.4)", bg: "bg-blue-500/10 text-blue-400", border: "border-blue-500/30" },
};

const STATUS_CONFIG = {
  blocked: { label: "BLOCKED", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  detected: { label: "DETECTED", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  mitigated: { label: "MITIGATED", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  investigating: { label: "INVESTIGATING", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

function generateThreatEvent(): ThreatEvent {
  const typeInfo = THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)];
  const severities: ThreatEvent["severity"][] = ["critical", "high", "medium", "low"];
  const weights = [0.1, 0.25, 0.35, 0.3];
  let r = Math.random(), severity = severities[0];
  for (let i = 0, sum = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r <= sum) { severity = severities[i]; break; }
  }
  const statuses: ThreatEvent["status"][] = ["blocked", "detected", "mitigated", "investigating"];
  const statusWeights = [0.5, 0.2, 0.2, 0.1];
  r = Math.random();
  let status = statuses[0];
  for (let i = 0, sum = 0; i < statusWeights.length; i++) {
    sum += statusWeights[i];
    if (r <= sum) { status = statuses[i]; break; }
  }

  return {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
    type: typeInfo.type as ThreatEvent["type"],
    severity,
    source: SOURCE_IPS[Math.floor(Math.random() * SOURCE_IPS.length)] + Math.floor(Math.random() * 255),
    target: TARGET_SYSTEMS[Math.floor(Math.random() * TARGET_SYSTEMS.length)],
    action: typeInfo.label,
    status,
    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    protocol: typeInfo.protocols[Math.floor(Math.random() * typeInfo.protocols.length)],
  };
}

function NetworkCanvas({ isRunning }: { isRunning: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<AttackNode[]>([]);
  const flowsRef = useRef<AttackFlow[]>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }>>([]);
  const frameRef = useRef(0);

  const initNodes = useCallback((w: number, h: number) => {
    const cx = w / 2, cy = h / 2;
    nodesRef.current = [
      { id: "attacker1", x: 60, y: cy * 0.4, label: "Threat Actor", type: "attacker", status: "under_attack", pulsePhase: 0 },
      { id: "attacker2", x: 60, y: cy * 1.2, label: "APT Group", type: "attacker", status: "under_attack", pulsePhase: 1 },
      { id: "attacker3", x: 60, y: cy * 1.8, label: "Bot Network", type: "attacker", status: "compromised", pulsePhase: 2 },
      { id: "firewall", x: cx * 0.55, y: cy, label: "WAF / Firewall", type: "firewall", status: "protected", pulsePhase: 0 },
      { id: "lb", x: cx * 0.85, y: cy * 0.5, label: "Load Balancer", type: "server", status: "safe", pulsePhase: 1 },
      { id: "api", x: cx * 0.85, y: cy * 1.5, label: "API Gateway", type: "server", status: "safe", pulsePhase: 2 },
      { id: "web", x: cx * 1.15, y: cy * 0.35, label: "Web Servers", type: "server", status: "safe", pulsePhase: 0 },
      { id: "auth", x: cx * 1.15, y: cy, label: "Auth Service", type: "server", status: "safe", pulsePhase: 1 },
      { id: "app", x: cx * 1.15, y: cy * 1.65, label: "App Cluster", type: "cloud", status: "safe", pulsePhase: 2 },
      { id: "db", x: cx * 1.5, y: cy * 0.6, label: "Database", type: "database", status: "protected", pulsePhase: 0 },
      { id: "storage", x: cx * 1.5, y: cy * 1.4, label: "Storage", type: "database", status: "protected", pulsePhase: 1 },
      { id: "endpoint1", x: w - 70, y: cy * 0.4, label: "Endpoints", type: "endpoint", status: "safe", pulsePhase: 2 },
      { id: "endpoint2", x: w - 70, y: cy * 1.6, label: "Users", type: "endpoint", status: "safe", pulsePhase: 0 },
    ];
  }, []);

  const EDGES: [string, string][] = [
    ["attacker1", "firewall"], ["attacker2", "firewall"], ["attacker3", "firewall"],
    ["firewall", "lb"], ["firewall", "api"],
    ["lb", "web"], ["lb", "auth"],
    ["api", "auth"], ["api", "app"],
    ["web", "db"], ["auth", "db"],
    ["app", "storage"], ["auth", "storage"],
    ["web", "endpoint1"], ["app", "endpoint2"],
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      initNodes(rect.width, rect.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const getNode = (id: string) => nodesRef.current.find(n => n.id === id);

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      frameRef.current++;
      const t = frameRef.current * 0.016;

      ctx.clearRect(0, 0, w, h);

      EDGES.forEach(([from, to]) => {
        const a = getNode(from), b = getNode(to);
        if (!a || !b) return;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const isAttackEdge = a.type === "attacker";
        if (isAttackEdge) {
          const pulse = Math.sin(t * 3 + a.pulsePhase) * 0.3 + 0.5;
          grad.addColorStop(0, `rgba(239,68,68,${pulse})`);
          grad.addColorStop(1, `rgba(239,68,68,0.1)`);
        } else {
          grad.addColorStop(0, "rgba(59,130,246,0.15)");
          grad.addColorStop(1, "rgba(59,130,246,0.08)");
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isAttackEdge ? 2 : 1;
        ctx.stroke();
      });

      if (isRunning && frameRef.current % 3 === 0) {
        const attackEdges = EDGES.filter(([f]) => getNode(f)?.type === "attacker");
        if (Math.random() < 0.4) {
          const edge = attackEdges[Math.floor(Math.random() * attackEdges.length)];
          const a = getNode(edge[0])!, b = getNode(edge[1])!;
          flowsRef.current.push({
            id: Math.random().toString(36).slice(2),
            fromNode: edge[0],
            toNode: edge[1],
            progress: 0,
            severity: (["critical", "high", "medium", "low"] as const)[Math.floor(Math.random() * 4)],
            blocked: Math.random() > 0.3,
            speed: 0.008 + Math.random() * 0.012,
          });
        }
        const safeEdges = EDGES.filter(([f]) => getNode(f)?.type !== "attacker");
        if (Math.random() < 0.3) {
          const edge = safeEdges[Math.floor(Math.random() * safeEdges.length)];
          flowsRef.current.push({
            id: Math.random().toString(36).slice(2),
            fromNode: edge[0],
            toNode: edge[1],
            progress: 0,
            severity: "low",
            blocked: false,
            speed: 0.005 + Math.random() * 0.008,
          });
        }
      }

      flowsRef.current = flowsRef.current.filter(f => f.progress <= 1.1);
      flowsRef.current.forEach(f => {
        if (!isRunning) return;
        f.progress += f.speed;
        const a = getNode(f.fromNode), b = getNode(f.toNode);
        if (!a || !b) return;

        const x = a.x + (b.x - a.x) * f.progress;
        const y = a.y + (b.y - a.y) * f.progress;
        const cfg = SEVERITY_CONFIG[f.severity];

        if (f.blocked && f.progress > 0.65 && f.progress < 0.75) {
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              x, y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1,
              color: cfg.color,
              size: 2 + Math.random() * 2,
            });
          }
        }

        if (f.blocked && f.progress > 0.7) return;

        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = cfg.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = cfg.glow;
        ctx.fill();
      });

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.025;
        p.vx *= 0.97;
        p.vy *= 0.97;
        const r = Math.max(0.1, p.size * p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `,${Math.max(0, p.life) * 0.8})`).replace("rgb", "rgba");
        ctx.fill();
      });

      nodesRef.current.forEach(node => {
        const pulse = Math.sin(t * 2 + node.pulsePhase * 2) * 0.3 + 0.7;
        let baseColor = "59,130,246";
        let glowRadius = 20;

        if (node.type === "attacker") {
          baseColor = "239,68,68";
          glowRadius = 25 + Math.sin(t * 4 + node.pulsePhase) * 8;
        } else if (node.status === "protected") {
          baseColor = "16,185,129";
        } else if (node.type === "database") {
          baseColor = "168,85,247";
        } else if (node.type === "cloud") {
          baseColor = "6,182,212";
        }

        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
        gradient.addColorStop(0, `rgba(${baseColor},${pulse * 0.3})`);
        gradient.addColorStop(1, `rgba(${baseColor},0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor},0.15)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${baseColor},${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor},${pulse})`;
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,0.7)`;
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + 26);
      });

      if (isRunning) {
        const gridOpacity = 0.03 + Math.sin(t * 0.5) * 0.01;
        ctx.strokeStyle = `rgba(59,130,246,${gridOpacity})`;
        ctx.lineWidth = 0.5;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isRunning, initNodes]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function AttackOriginRing({ events }: { events: ThreatEvent[] }) {
  const countryMap = new Map<string, number>();
  events.forEach(e => countryMap.set(e.country, (countryMap.get(e.country) || 0) + 1));
  const sorted = [...countryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-2">
      {sorted.map(([country, count]) => (
        <div key={country} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted-foreground truncate">{country}</span>
          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ProtocolBreakdown({ events }: { events: ThreatEvent[] }) {
  const protoMap = new Map<string, number>();
  events.forEach(e => protoMap.set(e.protocol, (protoMap.get(e.protocol) || 0) + 1));
  const sorted = [...protoMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const colors = ["text-red-400", "text-orange-400", "text-yellow-400", "text-blue-400", "text-cyan-400", "text-purple-400"];

  return (
    <div className="grid grid-cols-2 gap-2">
      {sorted.map(([proto, count], i) => (
        <div key={proto} className="flex items-center gap-2 text-xs">
          <div className={cn("w-2 h-2 rounded-full", colors[i]?.replace("text-", "bg-"))} />
          <span className="text-muted-foreground">{proto}</span>
          <span className={cn("ml-auto font-mono font-bold", colors[i])}>{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ThreatSimulationPage() {
  const [isRunning, setIsRunning] = useState(true);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [stats, setStats] = useState({
    totalAttacks: 0,
    blocked: 0,
    detected: 0,
    mitigated: 0,
    eventsPerSec: 0,
    criticalCount: 0,
  });

  useEffect(() => {
    const initial: ThreatEvent[] = [];
    for (let i = 0; i < 15; i++) {
      const evt = generateThreatEvent();
      evt.timestamp = Date.now() - (15 - i) * 2000;
      initial.push(evt);
    }
    setEvents(initial);
    const blockedCount = initial.filter(e => e.status === "blocked").length;
    const detectedCount = initial.filter(e => e.status === "detected").length;
    const mitigatedCount = initial.filter(e => e.status === "mitigated").length;
    setStats({
      totalAttacks: initial.length,
      blocked: blockedCount,
      detected: detectedCount,
      mitigated: mitigatedCount,
      eventsPerSec: 2.4,
      criticalCount: initial.filter(e => e.severity === "critical").length,
    });
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const newEvent = generateThreatEvent();
      setEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 200);
        return updated;
      });
      setStats(prev => ({
        totalAttacks: prev.totalAttacks + 1,
        blocked: prev.blocked + (newEvent.status === "blocked" ? 1 : 0),
        detected: prev.detected + (newEvent.status === "detected" ? 1 : 0),
        mitigated: prev.mitigated + (newEvent.status === "mitigated" ? 1 : 0),
        eventsPerSec: Math.round((2 + Math.random() * 4) * 10) / 10,
        criticalCount: prev.criticalCount + (newEvent.severity === "critical" ? 1 : 0),
      }));
    }, 800 + Math.random() * 1200);

    return () => clearInterval(interval);
  }, [isRunning]);

  const severityCounts = {
    critical: events.filter(e => e.severity === "critical").length,
    high: events.filter(e => e.severity === "high").length,
    medium: events.filter(e => e.severity === "medium").length,
    low: events.filter(e => e.severity === "low").length,
  };

  return (
    <div className="space-y-4" data-testid="page-threat-simulation">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            Live Threat Simulation
          </h1>
          <p className="text-muted-foreground mt-1">Real-time attack visualization and threat monitoring engine</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
            <span className="text-xs font-medium text-muted-foreground">
              {isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            data-testid="button-toggle-simulation"
          >
            {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Attacks</span>
            </div>
            <p className="text-xl font-bold text-red-400 mt-1 font-mono" data-testid="text-total-attacks">
              {stats.totalAttacks.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Blocked</span>
            </div>
            <p className="text-xl font-bold text-green-400 mt-1 font-mono" data-testid="text-blocked">
              {stats.blocked.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Detected</span>
            </div>
            <p className="text-xl font-bold text-yellow-400 mt-1 font-mono">
              {stats.detected.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Mitigated</span>
            </div>
            <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
              {stats.mitigated.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Events/sec</span>
            </div>
            <p className="text-xl font-bold text-cyan-400 mt-1 font-mono" data-testid="text-events-per-sec">
              {stats.eventsPerSec}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-xl font-bold text-red-400 mt-1 font-mono" data-testid="text-critical-count">
              {stats.criticalCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wifi className="w-4 h-4 text-primary" />
                Network Attack Topology
              </CardTitle>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Attacker</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Protected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Service</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Data</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[340px] bg-gradient-to-br from-background via-background to-muted/10" data-testid="canvas-network-topology">
              <NetworkCanvas isRunning={isRunning} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-400" />
                Attack Origins
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <AttackOriginRing events={events} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Protocol Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ProtocolBreakdown events={events} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Live Threat Feed
              </CardTitle>
              <div className="flex gap-2 text-[10px]">
                {Object.entries(severityCounts).map(([sev, count]) => (
                  <Badge key={sev} variant="secondary" className={cn("px-1.5 py-0 font-mono", SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG].bg)}>
                    {sev.charAt(0).toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[380px] overflow-y-auto" data-testid="feed-threat-events">
              {events.slice(0, 50).map((event, idx) => {
                const sevCfg = SEVERITY_CONFIG[event.severity];
                const statusCfg = STATUS_CONFIG[event.status];
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-2.5 border-b border-border/30 transition-all",
                      idx === 0 && isRunning && "animate-in fade-in slide-in-from-top-1 duration-300",
                      "hover:bg-muted/30"
                    )}
                    data-testid={`row-threat-${event.id}`}
                  >
                    <div className="pt-1 shrink-0">
                      <div className={cn("w-2 h-2 rounded-full")} style={{ backgroundColor: sevCfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{event.action}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", sevCfg.bg, sevCfg.border)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", statusCfg.color)}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{event.source}</span>
                        <span>→</span>
                        <span>{event.target}</span>
                        <span className="text-muted-foreground/60">via {event.protocol}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 text-right">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {event.country}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-red-500/20">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                Severity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-3">
                {(["critical", "high", "medium", "low"] as const).map(sev => {
                  const count = severityCounts[sev];
                  const total = events.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={sev}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize text-muted-foreground">{sev}</span>
                        <span className="font-mono font-bold" style={{ color: SEVERITY_CONFIG[sev].color }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: SEVERITY_CONFIG[sev].color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                Target Systems
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {(() => {
                  const targetMap = new Map<string, number>();
                  events.forEach(e => targetMap.set(e.target, (targetMap.get(e.target) || 0) + 1));
                  return [...targetMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([target, count]) => (
                    <div key={target} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{target}</span>
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                        {count}
                      </Badge>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-3 pb-2 px-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Defense Rate</span>
              </div>
              <p className="text-3xl font-bold text-green-400 font-mono" data-testid="text-defense-rate">
                {events.length > 0
                  ? Math.round(((stats.blocked + stats.mitigated) / stats.totalAttacks) * 100)
                  : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Threats neutralized</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
