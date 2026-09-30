import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(""); const [pin, setPin] = useState("");
  const [legacy, setLegacy] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await login(identifier.trim(), pin); }
    catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed"); }
    finally { setBusy(false); }
  }
  const [systemReady, setSystemReady] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  useEffect(() => {
    const lines = [
      "[OK] RSIMD-ITEMS interface initializing...",
      "[OK] Equipment maintenance workspace",
      "[OK] Quarterly reporting workspace",
      "[OK] Technician and officer access",
      "[OK] Staff ID and PIN sign-in",
      "[OK] Interface ready — awaiting authentication",
    ];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const finish = () => { clearInterval(interval); setBootLines(lines); setSystemReady(true); };
    const onMotion = () => { if (motion.matches) finish(); };
    if (motion.matches) finish();
    else interval = setInterval(() => {
      index += 1;
      setBootLines(lines.slice(0, index));
      if (index === lines.length) finish();
    }, 200);
    motion.addEventListener("change", onMotion);
    return () => { clearInterval(interval); motion.removeEventListener("change", onMotion); };
  }, []);
  const inputClass = "w-full bg-surface-950 border border-surface-700/50 rounded-lg px-4 py-3 font-mono text-sm text-neon-green placeholder:text-surface-600 focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/20 focus:outline-none transition-all";
  const labelClass = "block text-[10px] font-mono font-semibold text-surface-400 uppercase tracking-[0.15em] mb-1.5";

  return (
    <div className="login-terminal min-h-screen py-8 flex items-center justify-center relative overflow-hidden bg-surface-950">
      <div aria-hidden="true" className="absolute inset-0 bg-circuit-pattern animate-data-flow" />
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/90 to-surface-950" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      <div className="absolute top-4 left-4 font-mono text-[10px] text-neon-green/30 hidden sm:block">
        SYS://OHCS/RSIMD
      </div>
      <div className="absolute top-4 right-4 font-mono text-[10px] text-neon-green/30 hidden sm:block">
        v1.0.0 | PROD
      </div>

      <div className="relative w-full max-w-lg mx-4">
        <div className={`bg-surface-900/95 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-tech-xl transition-all duration-700 ${systemReady ? "border-neon-green/20" : "border-surface-700/30"}`}>

          {/* Terminal boot */}
          <div className="bg-surface-950 px-5 py-4 border-b border-surface-800/50">
            <div className="flex items-center gap-2 mb-3">
              <span className={`led ${systemReady ? "led-green" : "led-amber"} ${!systemReady ? "animate-pulse" : ""}`} />
              <span className="font-mono text-xs text-surface-400">
                {systemReady ? "INTERFACE READY" : "INITIALIZING..."}
              </span>
            </div>
            <div aria-hidden="true" className="font-mono text-[11px] leading-relaxed space-y-0.5 max-h-32 overflow-hidden">
              {bootLines.map((line, i) => line ? (
                <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="text-neon-green/70">{line.slice(0, 4)}</span>
                  <span className="text-surface-400">{line.slice(4)}</span>
                </div>
              ) : null)}
              {!systemReady && <span className="text-neon-green animate-blink">_</span>}
            </div>
          </div>

          {/* Form area */}
          <div className={`p-6 sm:p-8 transition-all duration-500 ${systemReady ? "opacity-100" : "opacity-30"}`}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-neon-green/20 bg-neon-green/5 mb-4 animate-glow-pulse">
                <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-bold text-surface-100 tracking-wider uppercase">RSIMD-ITEMS</h1>
              <p className="text-xs text-surface-500 mt-1.5 font-mono tracking-wide">OHCS EQUIPMENT MAINTENANCE SYSTEM</p>
            </div>

            <form onSubmit={submit} className="space-y-4 animate-fade-in">
              <div>
                <label htmlFor="login-identifier" className={labelClass}>{legacy ? "Existing account email" : "Staff ID"}</label>
                <input id="login-identifier" className={inputClass} type={legacy ? "email" : "text"} autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} maxLength={150} required placeholder={legacy ? "name@ohcs.gov.gh" : "Your official Staff ID"} />
              </div>
              <div>
                <label htmlFor="login-pin" className={labelClass}>PIN</label>
                <input id="login-pin" className={`${inputClass} tracking-[0.5em] text-center text-lg`} type="password" inputMode="numeric" autoComplete="current-password" minLength={4} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required placeholder="••••" aria-describedby="pin-help" />
                <p id="pin-help" className="font-mono text-[11px] text-surface-400 mt-1.5">4–6 digit PIN</p>
              </div>
              {error && <p role="alert" className="font-mono text-xs text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg px-4 py-2.5">{error}</p>}
              <button type="submit" aria-label="Sign in" disabled={busy || pin.length < 4 || !systemReady} className="w-full bg-neon-green/10 border border-neon-green/30 text-neon-green font-mono font-semibold rounded-lg px-4 py-3 text-sm uppercase tracking-wider hover:bg-neon-green/20 hover:shadow-neon-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-green transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]">
                {busy ? "Authenticating..." : "[ AUTHENTICATE ]"}
              </button>
            </form>
            <button type="button" className="mt-4 min-h-11 text-xs font-mono underline text-surface-300 hover:text-neon-green focus-visible:outline focus-visible:outline-neon-green" onClick={() => { setLegacy(!legacy); setIdentifier(""); setPin(""); setError(""); }}>{legacy ? "Use Staff ID instead" : "Existing account without a Staff ID?"}</button>
            <p className="mt-2 text-xs font-mono leading-relaxed text-surface-400">Your administrator creates your account. Your initial PIN is the last four digits of your Staff ID. You can keep it or choose a new PIN.</p>
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
