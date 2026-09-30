import { useState, type FormEvent } from "react";
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
  const input = "w-full rounded-lg border border-surface-700 bg-surface-950 px-4 py-3 font-mono text-surface-100 focus:border-neon-green focus:outline-none focus:ring-1 focus:ring-neon-green";
  return <main className="min-h-screen bg-surface-950 flex items-center justify-center p-4 relative">
    <div className="absolute inset-0 bg-circuit-pattern opacity-30 pointer-events-none" />
    <section className="relative w-full max-w-md rounded-2xl border border-neon-green/30 bg-surface-900 p-6 sm:p-8 shadow-tech-xl">
      <p className="font-mono text-xs text-neon-green mb-3">OHCS / RSIMD</p>
      <h1 className="font-mono text-2xl font-bold text-surface-100">RSIMD-ITEMS</h1>
      <p className="text-sm text-surface-300 mt-2 mb-6">Sign in to equipment maintenance and reporting.</p>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm text-surface-200">{legacy ? "Existing account email" : "Staff ID"}<input className={input} type={legacy ? "email" : "text"} autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} maxLength={150} required placeholder={legacy ? "name@ohcs.gov.gh" : "Your official Staff ID"} /></label>
        <label className="block text-sm text-surface-200">PIN<input className={input} type="password" inputMode="numeric" autoComplete="current-password" minLength={4} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required placeholder="4–6 digits" /></label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button className="w-full rounded-lg bg-neon-green/15 border border-neon-green/40 text-neon-green py-3 font-mono disabled:opacity-50" disabled={busy || pin.length < 4}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <button type="button" className="mt-5 py-2 text-sm underline text-surface-300" onClick={() => { setLegacy(!legacy); setIdentifier(""); setPin(""); setError(""); }}>{legacy ? "Use Staff ID instead" : "Existing account without a Staff ID?"}</button>
      <p className="mt-3 text-xs text-surface-400">Your administrator creates accounts for technicians and officers. New staff use the last four digits of their Staff ID as the temporary PIN, then choose whether to keep it or set a new PIN. ITEMS credentials are separate from SmartGate/VMS.</p>
    </section>
  </main>;
}
