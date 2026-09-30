import { useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
export function ChangePinPage() {
  const { user, changePin, keepPin, logout } = useAuth();
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (next !== confirm) { setError("The new PINs do not match"); return; }
    setBusy(true); try { await changePin(current, next); } catch (e) { setError(e instanceof Error ? e.message : "Could not change PIN"); } finally { setBusy(false); }
  }
  async function keep() {
    setBusy(true); setError("");
    try { await keepPin(current); } catch (e) { setError(e instanceof Error ? e.message : "Could not save PIN preference"); } finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-surface-950"><section className="max-w-md w-full rounded-2xl p-6 bg-white dark:bg-surface-900 space-y-4">
    <h1 className="text-xl font-semibold">Your PIN preference</h1><p className="text-sm">{user?.name}, you can set a new PIN or keep your current PIN. Your Staff ID is {user?.staff_id}.</p>
    <form onSubmit={submit} className="space-y-4">
      <Input label="Current PIN" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} required value={current} onChange={e => setCurrent(e.target.value.replace(/\D/g, ""))} />
      <Input label="New PIN" type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={6} required value={next} onChange={e => setNext(e.target.value.replace(/\D/g, ""))} />
      <Input label="Confirm new PIN" type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={6} required value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ""))} />
      {error && <p role="alert" className="text-red-600">{error}</p>}<Button type="submit" disabled={busy}>Save new PIN</Button>
    <Button type="button" variant="secondary" disabled={busy || current.length < 4} onClick={keep}>Keep my current PIN</Button>
    </form><button className="underline py-2 text-sm" onClick={() => void logout()}>Sign out</button>
  </section></main>;
}
