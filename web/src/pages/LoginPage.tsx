import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [systemReady, setSystemReady] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);

  // Boot sequence animation
  useEffect(() => {
    const lines = [
      "[OK] RSIMD-ITEMS v2.0 initializing...",
      "[OK] Cloudflare Workers runtime loaded",
      "[OK] D1 database connection established",
      "[OK] KV session store online",
      "[OK] R2 file storage mounted",
      "[OK] System ready — awaiting authentication",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]!]);
        i++;
      } else {
        setSystemReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch {
      setError("AUTH_FAIL: Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-950">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-circuit-pattern animate-data-flow" />
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/90 to-surface-950" />

      {/* Scan line overlay */}
      <div className="absolute inset-0 scanline pointer-events-none" />

      {/* Decorative circuit arcs */}
      <div className="absolute top-20 right-10 w-[300px] h-[300px] rounded-full border border-neon-green/5 hidden sm:block" />
      <div className="absolute bottom-20 left-10 w-[200px] h-[200px] rounded-full border border-neon-green/5 hidden sm:block" />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-neon-green/30 hidden sm:block">
        SYS://OHCS/RSIMD
      </div>
      <div className="absolute top-4 right-4 font-mono text-[10px] text-neon-green/30 hidden sm:block">
        v2.0.0 | PROD
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-lg mx-4">
        <div className={`bg-surface-900/95 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-tech-xl transition-all duration-700 ${systemReady ? "border-neon-green/20" : "border-surface-700/30"}`}>

          {/* Terminal boot sequence */}
          <div className="bg-surface-950 px-5 py-4 border-b border-surface-800/50">
            <div className="flex items-center gap-2 mb-3">
              <span className={`led ${systemReady ? "led-green" : "led-amber"} ${!systemReady ? "animate-pulse" : ""}`} />
              <span className="font-mono text-xs text-surface-400">
                {systemReady ? "SYSTEM ONLINE" : "BOOTING..."}
              </span>
            </div>
            <div className="font-mono text-[11px] leading-relaxed space-y-0.5 max-h-32 overflow-hidden">
              {bootLines.map((line, i) => (
                <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="text-neon-green/70">{line.slice(0, 4)}</span>
                  <span className="text-surface-400">{line.slice(4)}</span>
                </div>
              ))}
              {!systemReady && <span className="text-neon-green animate-blink">_</span>}
            </div>
          </div>

          {/* Login form area */}
          <div className={`p-6 sm:p-8 transition-all duration-500 ${systemReady ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-neon-green/20 bg-neon-green/5 mb-4 animate-glow-pulse">
                <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-bold text-surface-100 tracking-wider uppercase">
                RSIMD-ITEMS
              </h1>
              <p className="text-xs text-surface-500 mt-1.5 font-mono tracking-wide">
                OHCS EQUIPMENT MAINTENANCE SYSTEM
              </p>
              <div className="mt-3 flex items-center gap-2 justify-center">
                <div className="h-px flex-1 bg-surface-800" />
                <span className="text-[10px] font-mono text-neon-green/50 uppercase">Authentication Required</span>
                <div className="h-px flex-1 bg-surface-800" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-mono font-semibold text-surface-400 uppercase tracking-[0.15em] mb-1.5">
                  User ID
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ohcs.gov.gh"
                  required
                  autoComplete="email"
                  className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-4 py-3 font-mono text-sm text-neon-green placeholder:text-surface-600 focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-[10px] font-mono font-semibold text-surface-400 uppercase tracking-[0.15em] mb-1.5">
                  Access Key
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-surface-950 border border-surface-700/50 rounded-lg px-4 py-3 font-mono text-sm text-neon-green placeholder:text-surface-600 focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/20 focus:outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-neon-red/5 border border-neon-red/20 rounded-lg px-4 py-2.5">
                  <span className="led led-red" />
                  <span className="font-mono text-xs text-neon-red">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !systemReady}
                className="w-full bg-neon-green/10 border border-neon-green/30 text-neon-green font-mono font-semibold rounded-lg px-4 py-3 text-sm uppercase tracking-wider hover:bg-neon-green/20 hover:shadow-neon-green transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "[ AUTHENTICATE ]"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between">
              <span className="font-mono text-[10px] text-surface-600">GHANA.GOV.OHCS</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-surface-600">
                <span className="led led-green" /> SECURE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
