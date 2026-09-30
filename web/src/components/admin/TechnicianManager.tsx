import { useState, useEffect, useCallback, type FormEvent } from "react";
import { api } from "../../lib/api-client";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { StaffImport } from "./StaffImport";
import type { Technician } from "../../types";

const empty = { staff_id: "", name: "", email: "", phone: "", staff_category: "officer", role: "technician", is_active: true, reset_pin: false };
const accessName = (role: string) => role === "lead" ? "Report officer" : role === "admin" ? "Administrator" : "Member";
export function TechnicianManager() {
  const { user, logout } = useAuth();
  const [staff, setStaff] = useState<Technician[]>([]), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false), [id, setId] = useState<string | null>(null), [form, setForm] = useState(empty);
  const load = useCallback(async () => { try { setStaff(await api.get<Technician[]>("/technicians")); } catch (e) { setError(e instanceof Error ? e.message : "Could not load staff"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function edit(row?: Technician) {
    setId(row?.id ?? null); setForm(row ? { staff_id: row.staff_id ?? "", name: row.name, email: row.email ?? "", phone: row.phone ?? "", staff_category: row.staff_category ?? "technician", role: row.role, is_active: row.is_active !== false, reset_pin: false } : empty);
    setError(""); setNotice(""); setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = id ? await api.put<Technician & { temporary_pin?: string }>(`/technicians/${id}`, form) : await api.post<Technician & { temporary_pin?: string }>("/technicians", form);
      setNotice(result.temporary_pin ? "Account saved. The temporary PIN is the last four digits of the Staff ID; the user can keep it or choose a new PIN at first sign-in." : "Staff details saved."); setOpen(false);
      if (id === user?.id && (result.staff_id !== user.staff_id || form.reset_pin)) { await logout(); return; }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save staff"); } finally { setBusy(false); }
  }
  return <div>
    <StaffImport onCreated={() => void load()} />
    <div className="flex justify-between items-center gap-3 mb-4"><h3 className="text-lg font-semibold">Technicians and officers</h3><Button onClick={() => edit()}>Add staff member</Button></div>
    <p className="text-sm mb-4">Assign official Staff IDs to existing accounts using Edit. This preserves their history and current PIN. Category describes the staff member; system access controls report generation and administration.</p>
    {notice && <p role="status" className="mb-3">{notice}</p>}{error && !open && <p role="alert" className="text-red-600 mb-3">{error}</p>}
    {loading ? <p>Loading staff…</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Name", "Staff ID", "Category", "System access", "Status", "Action"].map(h => <th className="text-left p-2" key={h}>{h}</th>)}</tr></thead><tbody>{staff.map(row => <tr key={row.id} className="border-t border-surface-200 dark:border-surface-700"><td className="p-2">{row.name}</td><td className="p-2">{row.staff_id || "Not assigned — email login"}</td><td className="p-2">{row.staff_category === "officer" ? "Officer" : "Technician"}</td><td className="p-2">{accessName(row.role)}</td><td className="p-2">{row.is_active === false ? "Inactive" : row.must_change_pin ? "PIN preference pending" : "Active"}</td><td className="p-2"><Button variant="secondary" size="sm" onClick={() => edit(row)} aria-label={`Edit ${row.name}`}>Edit</Button></td></tr>)}</tbody></table></div>}
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title={id ? "Edit staff account" : "Add staff member"}>
      <form onSubmit={save} className="space-y-4">
        <Input label="Staff ID" required maxLength={40} value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} />
        <Input label="Full name" required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Select label="Staff category" options={[{ value: "technician", label: "Technician" }, { value: "officer", label: "Officer" }]} value={form.staff_category} onChange={e => setForm({ ...form, staff_category: e.target.value })} />
        <Select label="System access" options={[{ value: "technician", label: "Member" }, { value: "lead", label: "Report officer" }, { value: "admin", label: "Administrator" }]} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
        <Input label="Email (optional)" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        {id && <><label className="block text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Account active</label><label className="block text-sm"><input type="checkbox" checked={form.reset_pin} onChange={e => setForm({ ...form, reset_pin: e.target.checked })} /> Reset PIN to the last four digits of Staff ID</label></>}
        <p className="text-sm">New/reset accounts use the last four numeric digits of the Staff ID as their temporary PIN and can keep it or choose a different PIN on first login. Existing PINs are retained unless reset is selected.</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save staff account"}</Button>
      </form>
    </Modal>
  </div>;
}
