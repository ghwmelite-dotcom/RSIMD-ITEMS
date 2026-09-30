import { useEffect, useState, type ChangeEvent } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api-client";
import type { OrgEntity } from "../types";
import type { FormPreview, TeamForm } from "../lib/team-form-types";

interface Schedule { id: string; date: string; entity_code: string; rooms: string[]; technician_names: string[] }
const fieldClass = "w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-3 text-sm";

export function TeamFormsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [team, setTeam] = useState("");
  const [members, setMembers] = useState("");
  const [devicePages, setDevicePages] = useState(3);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<FormPreview | null>(null);
  const [upload, setUpload] = useState<TeamForm | null>(null);
  useEffect(() => {
    api.get<OrgEntity[]>("/org-entities").then(setEntities).catch(() => setError("Could not load the directory. Reconnect before exporting."));
    api.get<Schedule[]>("/schedules").then(setSchedules).catch(() => setSchedules([]));
  }, []);

  async function download(format: "docx" | "xlsx") {
    setError(""); setBusy(true);
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      const options = { year, quarter, team, members, entities: entities.filter(e => e.is_active), devicePages,
        rooms: schedule?.rooms.map(room => ({ entity: schedule.entity_code, room, date: schedule.date })) };
      const bytes = format === "docx"
        ? await (await import("../lib/team-word")).createTeamWord(options)
        : await (await import("../lib/team-workbook")).createTeamWorkbook(options);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a"); a.href = url; a.download = `OHCS-Team-Form-Q${quarter}-${year}.${format}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) { setError(e instanceof Error ? e.message : "Download failed"); }
    finally { setBusy(false); }
  }
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setError(""); setPreview(null); setUpload(null); setBusy(true);
    try {
      const word = file.name.toLowerCase().endsWith(".docx");
      if ((!word && !file.name.toLowerCase().endsWith(".xlsx")) || file.size > 2_000_000) throw new Error("Choose a Word (.docx) or Excel (.xlsx) team form no larger than 2 MB.");
      const bytes = await file.arrayBuffer();
      const data = word ? await (await import("../lib/team-word")).parseTeamWord(bytes)
        : await (await import("../lib/team-workbook")).parseTeamWorkbook(bytes);
      const result = await api.post<FormPreview>("/team-forms/preview", data);
      setUpload(data); setPreview(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the form"); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!upload || !preview?.valid) return;
    setError(""); setBusy(true);
    try { setPreview(await api.post<FormPreview>("/team-forms/import", upload)); }
    catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Upload failed; preview the form again"); }
    finally { setBusy(false); }
  }
  const form = preview?.form;
  return <div className="space-y-6 text-surface-800 dark:text-surface-100">
    <div><h1 className="font-mono text-xl font-bold">Team maintenance forms</h1>
      <p className="mt-2 text-sm text-surface-500">Download → complete with your team → preview → save for the quarterly report.</p></div>
    <Card><h2 className="font-semibold mb-4">1. Download an offline form</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Reporting year<input className={fieldClass} type="number" min={2000} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} /></label>
        <label className="text-sm">Reporting quarter<select aria-label="Reporting quarter" className={fieldClass} value={quarter} onChange={e => setQuarter(Number(e.target.value))}>{[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}</select></label>
        <label className="text-sm sm:col-span-2">Prefill from this week’s schedule (optional)
          <select className={fieldClass} value={scheduleId} onChange={e => {
            setScheduleId(e.target.value); const s = schedules.find(x => x.id === e.target.value);
            if (s) { setTeam(`${s.entity_code} team`); setMembers(s.technician_names.join(", ")); }
          }}><option value="">Blank form — enter the rooms in your form</option>{schedules.map(s => <option key={s.id} value={s.id}>{s.date} · {s.entity_code} · Rooms {s.rooms.join(", ")}</option>)}</select>
        </label>
        <label className="text-sm">Team name<input className={fieldClass} maxLength={120} value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. RSIMD team A" /></label>
        <label className="text-sm">Participating officers<input className={fieldClass} maxLength={1000} value={members} onChange={e => setMembers(e.target.value)} placeholder="Names of all participating team members" /></label>
      </div>
      <p className="text-sm my-4">Word is recommended for teams: a filled example, everyday language and one page per device. Your team name and members appear on the cover and visit pages. Keep Q3 selected for the exercise performed in October; record the actual visit dates separately.</p>
      <label className="block text-sm mb-4 max-w-xs">Device pages in Word<input className={fieldClass} type="number" min={1} max={100} value={devicePages} onChange={e => setDevicePages(Number(e.target.value))} /></label>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || !entities.length || !Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(devicePages) || devicePages < 1 || devicePages > 100} onClick={() => download("docx")}>Download Word form</Button>
        <Button disabled={busy || !entities.length || !Number.isInteger(year) || year < 2000 || year > 2100} onClick={() => download("xlsx")}>Download Excel form</Button>
      </div>
      <p className="text-xs text-surface-500 mt-3">Type answers in Word or Excel, then upload the same file here. Keep the table questions/headings. Copy a whole room or device table for more entries. For handwritten paper forms, type the answers into the file before uploading. Up to 50 rooms and 100 devices.</p>
    </Card>
    <Card><h2 className="font-semibold mb-3">2. Preview a completed form</h2>
      <label className="block text-sm">Completed Word or Excel form<input aria-label="Completed Word or Excel form" type="file" accept=".docx,.xlsx" disabled={busy} onChange={readFile} className="block mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:p-3 file:bg-surface-200" /></label>
      <p className="mt-3 text-sm text-surface-500">Only answers inside the form tables are imported. Check the preview before saving. Nothing is saved during preview. Re-uploading the same completed file will not duplicate its records. Imported checks appear in a separate team-exercise section of the quarterly Word report.</p>
    </Card>
    {busy && <p role="status">Processing form…</p>}
    {error && <p role="alert" className="rounded-lg border border-red-400 p-4">{error}</p>}
    {preview && <Card>
      <h2 className="font-semibold">{preview.saved ? "Records saved" : preview.duplicate ? "This form is already saved" : "3. Check and save"}</h2>
      {!preview.valid && <div role="alert" className="mt-3"><p>Correct these entries in your form, then preview again. Nothing was saved.</p><ul className="list-disc pl-5 mt-2">{preview.errors.map((e, i) => <li key={i}>{e.location}: {e.message}</li>)}</ul></div>}
      {form && <>
        <p className="mt-3"><strong>Q{form.quarter} {form.year} · {form.team}</strong></p>
        <p className="text-sm">Team: {form.members}</p>
        <p className="my-3">{form.rooms.length} room visit records · {form.devices.length} device records · {form.devices.filter(d => d.after === "functional").length} recorded functional afterwards</p>
        {preview.warnings?.map(w => <p className="border-l-4 border-ghana-gold pl-3 my-3 text-sm" key={w}>{w}</p>)}
        <div className="overflow-x-auto"><table className="text-sm w-full"><caption className="text-left font-semibold mb-2">Room visits</caption><thead><tr>{["Directorate", "Room", "Date", "Status", "Notes"].map(h => <th className="text-left p-2" key={h}>{h}</th>)}</tr></thead><tbody>{form.rooms.map((r, i) => <tr key={i} className="border-t border-surface-300 dark:border-surface-700">{[r.entity, r.room, r.date, r.status, r.notes].map((v, j) => <td className="p-2" key={j}>{v}</td>)}</tr>)}</tbody></table></div>
        <div className="overflow-x-auto mt-4"><table className="text-sm w-full"><caption className="text-left font-semibold mb-2">Device outcomes</caption><thead><tr>{["Device", "Room", "Date", "Before", "After", "Outstanding"].map(h => <th className="text-left p-2" key={h}>{h}</th>)}</tr></thead><tbody>{form.devices.map((d, i) => <tr key={i} className="border-t border-surface-300 dark:border-surface-700">{[d.reference, `${d.entity} / ${d.room}`, d.date, d.before, d.after, d.outstanding].map((v, j) => <td className="p-2" key={j}>{v}</td>)}</tr>)}</tbody></table></div>
        <details className="my-4"><summary className="cursor-pointer">Checks, work and team observations</summary>
          {form.devices.map((d, i) => <div key={i} className="mt-3 border-l-2 border-surface-300 pl-3 text-sm space-y-1">
            <p className="font-semibold">{d.reference} · {d.type} · {d.makeModel} · {d.officer}</p>
            <p>Checks: {d.checks}</p><p>Work: {d.work || "None recorded"}</p><p>Final test: {d.finalTest}</p>
            <p>Recommendation / parts: {d.recommendation || "None recorded"}</p>
          </div>)}
          <p className="mt-3 text-sm">Challenges: {form.challenges || "None recorded"}</p>
          <p className="mt-2 text-sm">Recommendations: {form.recommendations || "None recorded"}</p>
          <p className="mt-2 text-sm">Helpdesk observations: {form.helpdesk || "Not supplied"}</p>
        </details>
        {preview.valid && !preview.saved && !preview.duplicate && <Button disabled={busy} onClick={save}>Save records for Q{form.quarter} {form.year}</Button>}
        {preview.saved && <p role="status" className="mt-3">Saved for quarterly reporting. {preview.duplicate ? "No duplicate records were added." : "Keep the original form for your records."}</p>}
      </>}
    </Card>}
  </div>;
}
