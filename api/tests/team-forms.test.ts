import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { Workbook } from "exceljs";
import JSZip from "jszip";
import { validateTeamForm, getTeamForms, observationKeys, type TeamForm } from "../src/services/team-form";
import { teamFormImport } from "../src/routes/team-forms";
import { generateDocx } from "../src/services/report-generator";
import { createTeamWorkbook, parseTeamWorkbook } from "../../web/src/lib/team-workbook";
import type { Env } from "../src/types";

function sample(): TeamForm {
  return { version: 1, id: crypto.randomUUID(), year: 2026, quarter: 3, team: "Synthetic test team", members: "Test IT officer, Test admin officer",
    challenges: "Replacement toner unavailable", recommendations: "Procure one toner cartridge", helpdesk: "No helpdesk data supplied",
    rooms: [{ entity: "RSIMD", room: "19", date: "2026-10-01", mode: "on_site", status: "visited", notes: "" }],
    devices: [{ entity: "RSIMD", room: "19", date: "2026-10-01", reference: "TEST-ASSET-1", type: "desktop", makeModel: "Synthetic PC", before: "functional", checks: "Boot, keyboard, network", work: "No repair needed", after: "functional", finalTest: "Opened shared drive", outstanding: "", recommendation: "", officer: "Test IT officer" }],
  };
}
const databases: DatabaseSync[] = [];
afterEach(() => { databases.splice(0).forEach(db => db.close()); });

// Exercise actual SQLite constraints and transaction rollback through a small D1 adapter.
function database(migrate = true) {
  const sqlite = new DatabaseSync(":memory:"); databases.push(sqlite);
  sqlite.exec("PRAGMA foreign_keys = ON; CREATE TABLE technicians (id TEXT PRIMARY KEY, is_active INTEGER); INSERT INTO technicians VALUES ('tester', 1); CREATE TABLE org_entities (code TEXT, is_active INTEGER); INSERT INTO org_entities VALUES ('RSIMD', 1);");
  sqlite.exec("ALTER TABLE technicians ADD COLUMN role TEXT DEFAULT 'technician'");
  if (migrate) {
    sqlite.exec(readFileSync(new URL("../src/db/migration-004-team-forms.sql", import.meta.url), "utf8"));
    sqlite.exec(readFileSync(new URL("../migrations/0003_team_form_revisions.sql", import.meta.url), "utf8"));
  }
  function statement(sql: string, args: (string | number | null)[] = []) {
    return {
      bind: (...values: (string | number | null)[]) => statement(sql, values),
      first: async () => sqlite.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
      run: async () => sqlite.prepare(sql).run(...args),
    };
  }
  const db = { prepare: statement, batch: async (statements: ReturnType<typeof statement>[]) => {
    sqlite.exec("BEGIN");
    try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec("COMMIT"); return results; }
    catch (e) { sqlite.exec("ROLLBACK"); throw e; }
  } } as unknown as D1Database;
  const env = { DB: db, KV: { get: async () => JSON.stringify({ technician_id: "tester", name: "Test uploader", role: "technician" }) } } as unknown as Env;
  return { sqlite, db, env };
}
function request(form: unknown, authenticated = true) {
  return new Request("https://test.invalid/api/team-forms/import", { method: "POST", headers: { ...(authenticated ? { Authorization: "Bearer ritems_test" } : {}), "Content-Type": "application/json" }, body: JSON.stringify(form) });
}

describe("team form validation", () => {
  it("keeps Q3 attribution and real October dates without inventing faults", () => {
    const { form, errors } = validateTeamForm(sample(), ["RSIMD"]);
    expect(errors).toEqual([]); expect(form.quarter).toBe(3); expect(form.devices[0]?.date).toBe("2026-10-01");
    expect(form.devices[0]?.after).toBe("functional");
  });
  it("rejects unknown locations, invalid dates, absent final tests and silent failures", () => {
    const f = sample(); Object.assign(f.devices[0]!, { entity: "UNKNOWN", date: "2026-02-30", after: "nonfunctional", finalTest: "" });
    const { errors } = validateTeamForm(f, ["RSIMD"]);
    expect(errors.map(e => e.message).join(" ")).toMatch(/Unknown.*real YYYY-MM-DD.*finalTest.*outstanding/);
  });
  it("allows an inaccessible room with no invented devices", () => {
    const f = sample(); f.devices = []; f.rooms[0]!.status = "inaccessible"; f.rooms[0]!.notes = "Office locked";
    expect(validateTeamForm(f, ["RSIMD"]).errors).toEqual([]);
  });
  it("rejects a device in an inaccessible room and duplicate device observations", () => {
    const f = sample(); f.rooms[0]!.status = "inaccessible"; f.rooms[0]!.notes = "Locked"; f.devices.push({ ...f.devices[0]! });
    const errors = validateTeamForm(f, ["RSIMD"]).errors;
    expect(errors.some(e => e.message.includes("visited/revisit"))).toBe(true);
    expect(errors.some(e => e.message.includes("Duplicate device"))).toBe(true);
  });
  it("limits version, reporting period and data sizes", () => {
    const f = sample(); f.version = 9; f.year = 1; f.quarter = 0; f.team = "x".repeat(121);
    expect(validateTeamForm(f, ["RSIMD"]).errors).toHaveLength(4);
  });
  it("deduplicates the same observation even if a copy changes reporting quarter", async () => {
    const f = sample(); const a = await observationKeys(f); f.quarter = 4;
    expect(await observationKeys(f)).toEqual(a);
  });
});

describe("transactional import", () => {
  it("preview does not write; save preserves evidence; replay is a no-op", async () => {
    const { env, sqlite, db } = database(); const f = sample();
    const preview = await (await teamFormImport(request(f), env, false)).json();
    expect(preview.valid).toBe(true); expect(preview.warnings).toHaveLength(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(0);
    expect((await teamFormImport(request(f), env, true)).status).toBe(201);
    const replay = await (await teamFormImport(request(f), env, true)).json();
    expect(replay.duplicate).toBe(true);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(1);
    expect((await getTeamForms(db, 2026, 3))[0]?.challenges).toBe(f.challenges);
    expect(await getTeamForms(db, 2026, 4)).toEqual([]);
  });
  it("rejects a changed saved workbook and a copied observation", async () => {
    const { env, sqlite } = database(); const f = sample(); await teamFormImport(request(f), env, true);
    f.members = "Changed team";
    expect((await teamFormImport(request(f), env, true)).status).toBe(403);
    f.id = crypto.randomUUID(); f.quarter = 4;
    expect((await teamFormImport(request(f), env, true)).status).toBe(409);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(1);
  });
  it("allows different teams to fill copies of the same blank workbook", async () => {
    const { env, sqlite } = database(); const f = sample();
    expect((await teamFormImport(request(f), env, true)).status).toBe(201);
    f.team = "Second team"; f.rooms[0]!.room = "20"; f.devices[0]!.room = "20"; f.devices[0]!.reference = "TEST-ASSET-2";
    expect((await teamFormImport(request(f), env, true)).status).toBe(201);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(2);
  });
  it("has no partial writes when validation fails", async () => {
    const { env, sqlite } = database(); const f = sample(); f.devices[0]!.after = "invalid";
    expect((await teamFormImport(request(f), env, true)).status).toBe(400);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(0);
  });
  it("rejects oversized request data before parsing or saving", async () => {
    const { env, sqlite } = database();
    const response = await teamFormImport(request({ text: "x".repeat(1_000_001) }), env, true);
    expect(response.status).toBe(413);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(0);
  });
  it("database batch rolls back a parent when a duplicate observation is found", async () => {
    const { env, db, sqlite } = database(); const f = sample(); await teamFormImport(request(f), env, true);
    const key = (await observationKeys(f))[0]!;
    await expect(db.batch([
      db.prepare("INSERT INTO team_forms (id,year,quarter,team,payload,content_hash,uploaded_by) VALUES ('new',2026,3,'x','{}','x','tester')"),
      db.prepare("INSERT INTO team_form_observations VALUES (?, 'new')").bind(key),
    ])).rejects.toThrow();
    expect(sqlite.prepare("SELECT id FROM team_forms WHERE id='new'").get()).toBeUndefined();
  });
  it("blocks anonymous and deactivated users", async () => {
    const { env, sqlite } = database();
    expect((await teamFormImport(request(sample(), false), env, true)).status).toBe(401);
    sqlite.exec("UPDATE technicians SET is_active=0");
    expect((await teamFormImport(request(sample()), env, true)).status).toBe(403);
  });
  it("reports a missing migration without breaking legacy report aggregation", async () => {
    const { env, db } = database(false);
    expect((await teamFormImport(request(sample()), env, false)).status).toBe(503);
    expect(await getTeamForms(db, 2026, 3)).toEqual([]);
  });
});

describe("saved return revisions", () => {
  it("requires a privileged preview, preserves history and replaces observation keys", async () => {
    const { env, sqlite } = database(); const f = sample();
    await teamFormImport(request(f), env, true);
    f.rooms[0]!.date = "2026-10-04"; f.devices[0]!.date = "2026-10-04";
    expect((await teamFormImport(request(f), env, false)).status).toBe(403);
    sqlite.exec("UPDATE technicians SET role='admin'");
    const preview = await (await teamFormImport(request(f), env, false)).json();
    expect(preview.revision).toBe(true);
    expect((await teamFormImport(request(f), env, true)).status).toBe(409);
    expect((await teamFormImport(request({ ...f, expectedHash: preview.expectedHash }), env, true)).status).toBe(200);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get()?.n).toBe(1);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_form_revisions").get()?.n).toBe(1);
    expect(sqlite.prepare("SELECT payload FROM team_form_revisions").get()?.payload).toContain("2026-10-01");
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_form_observations").get()?.n).toBe(2);
    f.challenges = "Another change";
    expect((await teamFormImport(request({ ...f, expectedHash: preview.expectedHash }), env, true)).status).toBe(409);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_form_revisions").get()?.n).toBe(1);
  });
  it("rejects overlapping revisions without losing the original return", async () => {
    const { env, sqlite } = database(); const f = sample(); await teamFormImport(request(f), env, true);
    const other = sample(); other.rooms[0]!.room = "20"; other.devices[0]!.room = "20"; other.devices[0]!.reference = "OTHER";
    await teamFormImport(request(other), env, true);
    sqlite.exec("UPDATE technicians SET role='admin'");
    f.rooms[0]!.room = "20"; f.devices[0]!.room = "20";
    const preview = await (await teamFormImport(request(f), env, false)).json();
    expect(preview.valid).toBe(false);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM team_form_revisions").get()?.n).toBe(0);
  });
});

describe("Excel round trip and report evidence", () => {
  async function workbook() {
    const bytes = await createTeamWorkbook({ year: 2026, quarter: 3, team: "Test team", members: "Test officer", entities: [{ code: "RSIMD", name: "Test directorate" }] });
    const wb = new Workbook(); await wb.xlsx.load(bytes.buffer as ArrayBuffer); return wb;
  }
  async function read(wb: Workbook) { const b = await wb.xlsx.writeBuffer(); return parseTeamWorkbook(new Uint8Array(b).buffer); }
  it("exports a fillable blank form without importing its example", async () => {
    const wb = await workbook(); const parsed = await read(wb);
    expect(parsed.quarter).toBe(3); expect(parsed.devices).toEqual([]); expect(parsed.rooms).toEqual([]);
    expect(wb.getWorksheet("Devices")?.getCell("J2").dataValidation.type).toBe("list");
  });
  it("reads actual Excel cells and generates a report with dated outcomes and recommendations", async () => {
    const wb = await workbook(); const f = sample();
    wb.getWorksheet("Rooms")!.getRow(2).values = Object.values(f.rooms[0]!);
    wb.getWorksheet("Devices")!.getRow(2).values = Object.values(f.devices[0]!);
    wb.getWorksheet("Team")!.getCell("B8").value = f.challenges;
    const parsed = await read(wb);
    expect(validateTeamForm(parsed, ["RSIMD"]).errors).toEqual([]);
    const narratives = { introduction: "Test", methodology: "Test", conditionBased: "Test", routineNarrative: "Test", correctiveNarrative: "Test", emergencyNarrative: "Test", predictive: "Test", challenges: "Test challenge description.", recommendations: "Test recommendation description.", conclusion: "Test" };
    const bytes = await generateDocx({ year: 2026, quarter: 3, narratives, tables: { routineByCategory: [], correctiveSummary: [], correctiveByEntity: [], emergencyByCategory: [], teamForms: [parsed] } });
    const zip = await JSZip.loadAsync(bytes); const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("2026-10-01"); expect(xml).toContain("TEST-ASSET-1"); expect(xml).toContain(f.challenges);
    expect(xml).toContain("functional: 1"); expect(xml).toContain("Opened shared drive");
    expect(xml).toContain("Submitted Room Maintenance Findings");
    expect(xml).toContain("No emergency intervention recorded");
    expect(xml).not.toContain("100%");
    const toc = xml.match(/<w:sdtContent>([\s\S]*?)<\/w:sdtContent>/)?.[1];
    expect(toc).toContain("1.0 Introduction");
    expect(toc).toContain("6.0 Conclusion");
    expect(toc).toContain("3.6 Participating Teams");
    expect(toc).toContain("Annex: Team Maintenance Evidence");
  });
  it("rejects formulas instead of trusting cached values", async () => {
    const wb = await workbook(); wb.getWorksheet("Team")!.getCell("B6").value = { formula: '"hidden"', result: "hidden" };
    await expect(read(wb)).rejects.toThrow(/plain text/);
  });
  it("rejects malformed archives and altered column labels", async () => {
    await expect(parseTeamWorkbook(new ArrayBuffer(30))).rejects.toThrow(/archive/);
    const wb = await workbook(); wb.getWorksheet("Devices")!.getCell("A1").value = "Changed";
    await expect(read(wb)).rejects.toThrow(/headers/);
  });
});
