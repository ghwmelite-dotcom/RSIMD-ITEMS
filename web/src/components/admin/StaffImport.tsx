import { useState, type ChangeEvent } from "react";
import { api } from "../../lib/api-client";
import { Button } from "../ui/Button";
import type { StaffImportRow, StaffCredential } from "../../lib/staff-workbook";
interface Preview { valid: boolean; rows: (StaffImportRow & { status: string })[]; errors: { row: number; message: string }[]; new_count: number; existing_count: number }
export function downloadBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function StaffImport({ onCreated }: { onCreated: () => void }) {
  const [rows, setRows] = useState<StaffImportRow[]>([]), [preview, setPreview] = useState<Preview | null>(null);
  const [credentials, setCredentials] = useState<StaffCredential[]>([]), [message, setMessage] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function template() { setBusy(true); setError(""); try { downloadBytes(await (await import("../../lib/staff-workbook")).createStaffTemplate(), "OHCS-Staff-Account-Template.xlsx"); } catch { setError("Could not download template"); } finally { setBusy(false); } }
  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setBusy(true); setError(""); setPreview(null); setMessage("");
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 2_000_000) throw new Error("Choose a staff template (.xlsx) up to 2 MB");
      const parsed = await (await import("../../lib/staff-workbook")).parseStaffTemplate(await file.arrayBuffer());
      setRows(parsed); setPreview(await api.post<Preview>("/staff-import/preview", { rows: parsed }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not preview staff"); } finally { setBusy(false); }
  }
  async function commit() {
    setBusy(true); setError("");
    try {
      const result = await api.post<{ created: number; skipped: number; credentials: StaffCredential[] }>("/staff-import/commit", { rows });
      setCredentials(result.credentials); setPreview(null); setRows([]);
      setMessage(`${result.created} accounts created; ${result.skipped} existing accounts left unchanged.`); onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed"); } finally { setBusy(false); }
  }
  async function pins() {
    setBusy(true); setError(""); try { downloadBytes(await (await import("../../lib/staff-workbook")).credentialWorkbook(credentials), "ITEMS-Private-Temporary-PINs.xlsx"); }
    catch { setError("Could not download PIN list. Keep this page open and retry."); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-surface-300 dark:border-surface-700 p-4 space-y-3 mb-6">
    <h3 className="font-semibold">Create staff accounts from a template</h3>
    <p className="text-sm">Download the template, enter Staff IDs and names, choose Technician or Officer, then preview. System access is separate: Member or Report officer. Up to 50 people per file. Temporary PINs are the last four digits of Staff ID; users can keep or change them on first login.</p>
    <Button variant="secondary" disabled={busy} onClick={template}>Download staff template</Button>
    <label className="block text-sm">Completed staff template<input type="file" accept=".xlsx" disabled={busy || credentials.length > 0} onChange={read} className="block my-2 max-w-full" /></label>
    {error && <p role="alert" className="text-red-600">{error}</p>}{message && <p role="status">{message}</p>}
    {preview && <div className="space-y-3">
      {preview.errors.map(e => <p role="alert" key={e.row}>Row {e.row}: {e.message}</p>)}
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left font-semibold">Staff import preview — nothing saved yet</caption><thead><tr>{["Staff ID", "Name", "Category", "Access", "Action"].map(h => <th className="text-left p-2" key={h}>{h}</th>)}</tr></thead><tbody>{preview.rows.map((row, i) => <tr key={i}>{[row.staff_id, row.name, row.staff_category, row.role === "lead" ? "Report officer" : "Member", row.status === "new" ? "Create" : "Skip existing"].map((v, j) => <td className="p-2" key={j}>{v}</td>)}</tr>)}</tbody></table></div>
      {preview.valid && <Button disabled={busy} onClick={commit}>Create {preview.new_count} staff accounts</Button>}
    </div>}
    {credentials.length > 0 && <div className="space-y-3 border-l-4 border-ghana-gold pl-3">
      <p>Temporary PINs are available only in this session. Download them now, give each officer only their own details, then clear this list. A lost list requires individual PIN resets.</p>
      <Button disabled={busy} onClick={pins}>Download private temporary PINs</Button>
      <Button variant="secondary" disabled={busy} onClick={() => setCredentials([])}>Clear PIN list</Button>
    </div>}
  </section>;
}
