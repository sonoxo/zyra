import { Link, useLocation } from "wouter";
import { Shield, RadioTower } from "lucide-react";

export default function WarRoomLauncher() {
  const [location] = useLocation();
  if (location === "/auth" || location.startsWith("/verify-email") || location.startsWith("/reset-password") || location.startsWith("/accept-invite") || location === "/war-room") {
    return null;
  }

  return (
    <Link href="/war-room">
      <button
        data-testid="war-room-launcher"
        className="fixed bottom-5 right-5 z-50 group rounded-2xl border border-emerald-400/40 bg-black/90 px-4 py-3 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl transition hover:border-cyan-300/70 hover:text-cyan-200 hover:shadow-[0_0_36px_rgba(34,211,238,0.30)]"
        aria-label="Open AEGIS War Room"
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
            <Shield className="h-4 w-4" />
            <RadioTower className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-cyan-300" />
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-500/80">AEGIS</span>
            <span className="block text-sm font-semibold">War Room</span>
          </span>
        </span>
      </button>
    </Link>
  );
}
