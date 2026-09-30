import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { Workbook } from "exceljs";
import type { Env, TechnicianRow } from "../src/types";
import { importStaff } from "../src/routes/staff-import";
import { login, changePin, keepPin, register, me } from "../src/routes/auth";
import { updateTechnician, getTechnicians } from "../src/routes/technicians";
import { authenticate, requireRole } from "../src/middleware/auth";
import { hashPin, verifyPin, temporaryPin } from "../src/services/staff-auth";
import { createStaffTemplate, parseStaffTemplate } from "../../web/src/lib/staff-workbook";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach(db => db.close()));
function fixture() {
  const sqlite = new DatabaseSync(":memory:"); databases.push(sqlite);
  sqlite.exec(readFileSync(new URL("../src/db/schema.sql", import.meta.url), "utf8"));
  sqlite.exec("INSERT INTO technicians(id,name,role,password_hash,email) VALUES ('admin','Test admin','admin','unused','admin@example.test')");
  const kv = new Map<string, string>([["session:ritems_admin", JSON.stringify({ technician_id: "admin", name: "Test admin", role: "admin" })]]);
  function stmt(sql: string, args: (string | number | null)[] = []) {
    return { bind: (...values: (string | number | null)[]) => stmt(sql, values), first: async () => sqlite.prepare(sql).get(...args) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...args) }), run: async () => sqlite.prepare(sql).run(...args) };
  }
  const env = { DB: { prepare: stmt, batch: async (statements: ReturnType<typeof stmt>[]) => {
    sqlite.exec("BEGIN"); try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec("COMMIT"); return result; } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
  } }, KV: { get: async (key: string) => kv.get(key) ?? null, put: async (key: string, value: string) => { kv.set(key, value); }, delete: async (key: string) => { kv.delete(key); } } } as unknown as Env;
  return { env, sqlite, kv };
}
const row = { staff_id: "001234", name: "Test officer", staff_category: "Officer", role: "Report officer", email: "", phone: "" };
function request(path: string, body: unknown = {}, token = "ritems_admin") {
  return new Request(`https://test.invalid/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
async function onboard(env: Env) {
  return (await (await importStaff(request("staff-import/commit", { rows: [row] }), env, true)).json()) as { credentials: { temporary_pin: string }[]; created: number };
}
async function signIn(env: Env, pin = "1234") {
  return (await (await login(request("auth/login", { staff_id: row.staff_id, pin }, ""), env)).json()) as { token: string; technician: { must_change_pin: boolean } };
}
describe("staff import and login", () => {
  it("previews without writes, creates correct categories/access and skips unchanged repeats without resetting PINs", async () => {
    const f = fixture(); const preview = await importStaff(request("staff-import/preview", { rows: [row] }), f.env, false);
    expect((await preview.json() as { new_count: number }).new_count).toBe(1);
    expect(f.sqlite.prepare("SELECT count(*) n FROM technicians").get()!.n).toBe(1);
    const result = await onboard(f.env); expect(result.created).toBe(1); expect(result.credentials[0]!.temporary_pin).toBe("1234");
    const staff = f.sqlite.prepare("SELECT * FROM technicians WHERE staff_id=?").get(row.staff_id) as unknown as TechnicianRow;
    expect(staff.staff_category).toBe("officer"); expect(staff.role).toBe("lead"); expect(await verifyPin("1234", staff.password_hash)).toBe(true);
    expect(JSON.stringify(await (await getTechnicians(request("technicians"), f.env)).json())).not.toContain(staff.password_hash);
    expect((await onboard(f.env)).created).toBe(0);
  });
  it("rejects bad/duplicate/conflicting rows without partial writes or bulk admin privilege", async () => {
    const f = fixture();
    for (const rows of [[row, { ...row, staff_id: "bad" }], [row, row], [{ ...row, role: "admin" }]]) expect((await importStaff(request("staff-import/commit", { rows }), f.env, true)).status).toBe(400);
    expect(f.sqlite.prepare("SELECT count(*) n FROM technicians").get()!.n).toBe(1);
    await onboard(f.env);
    expect((await importStaff(request("staff-import/commit", { rows: [{ ...row, name: "Different person" }] }), f.env, true)).status).toBe(400);
  });
  it("allows staff to keep their default PIN, remembers the choice and revokes the old session", async () => {
    const f = fixture(); await onboard(f.env); const signed = await signIn(f.env);
    expect(signed.technician.must_change_pin).toBe(true);
    expect((await authenticate(request("equipment", {}, signed.token), f.env) as Response).status).toBe(403);
    const kept = await keepPin(request("auth/keep-pin", { current_pin: "1234" }, signed.token), f.env);
    expect(kept.status).toBe(200); const result = await kept.json() as { token: string; technician: { must_change_pin: boolean } };
    expect(result.technician.must_change_pin).toBe(false);
    const session = await authenticate(request("equipment", {}, result.token), f.env); expect(session).not.toBeInstanceOf(Response);
    expect((await authenticate(request("equipment", {}, signed.token), f.env) as Response).status).toBe(401);
    expect((await signIn(f.env)).technician.must_change_pin).toBe(false);
  });
  it("also supports choosing a new PIN, rejects incorrect confirmation and invalidates the initial PIN", async () => {
    const f = fixture(); await onboard(f.env); const signed = await signIn(f.env);
    expect((await keepPin(request("auth/keep-pin", { current_pin: "9999" }, signed.token), f.env)).status).toBe(400);
    expect((await changePin(request("auth/change-pin", { current_pin: "1234", new_pin: "6821" }, signed.token), f.env)).status).toBe(200);
    expect((await login(request("auth/login", { staff_id: row.staff_id, pin: "1234" }, ""), f.env)).status).toBe(401);
    expect((await signIn(f.env, "6821")).token).toMatch(/^ritems_/);
  });
  it("resets a PIN to the Staff ID suffix and invalidates existing sessions", async () => {
    const f = fixture(); await onboard(f.env); const signed = await signIn(f.env);
    const changed = await (await changePin(request("auth/change-pin", { current_pin: "1234", new_pin: "6821" }, signed.token), f.env)).json() as { token: string };
    const staff = f.sqlite.prepare("SELECT id FROM technicians WHERE staff_id=?").get(row.staff_id)!;
    const reset = await updateTechnician(request(`technicians/${staff.id}`, { reset_pin: true }), f.env, String(staff.id));
    expect(reset.status).toBe(200);
    expect(await reset.json()).toMatchObject({ temporary_pin: "1234", must_change_pin: true });
    expect((await authenticate(request("equipment", {}, changed.token), f.env) as Response).status).toBe(401);
    expect((await signIn(f.env)).technician.must_change_pin).toBe(true);
    expect((await login(request("auth/login", { staff_id: row.staff_id, pin: "6821" }, ""), f.env)).status).toBe(401);
  });
  it("retains legacy bcrypt email login until an administrator assigns the Staff ID", async () => {
    const f = fixture(); f.sqlite.prepare("UPDATE technicians SET password_hash=? WHERE id='admin'").run(await hash("5682", 4));
    expect((await login(request("auth/login", { email: "admin@example.test", pin: "5682" }, ""), f.env)).status).toBe(200);
    expect((await updateTechnician(request("technicians/admin", { staff_id: "ADMIN-1200" }), f.env, "admin")).status).toBe(200);
    expect((await login(request("auth/login", { email: "admin@example.test", pin: "5682" }, ""), f.env)).status).toBe(401);
    expect((await login(request("auth/login", { staff_id: "admin-1200", pin: "5682" }, ""), f.env)).status).toBe(200);
  });
  it("denies non-admin imports, enforces current role/deactivation and disables self-registration", async () => {
    const f = fixture(); await onboard(f.env); const signed = await signIn(f.env); const kept = await (await keepPin(request("auth/keep-pin", { current_pin: "1234" }, signed.token), f.env)).json() as { token: string };
    expect((await importStaff(request("staff-import/preview", { rows: [row] }, kept.token), f.env, false)).status).toBe(403);
    f.sqlite.prepare("UPDATE technicians SET role='technician' WHERE staff_id=?").run(row.staff_id);
    const session = await authenticate(request("reports", {}, kept.token), f.env);
    if (session instanceof Response) throw new Error("Expected active session");
    expect(requireRole(session, request("reports"), "lead", "admin")?.status).toBe(403);
    f.sqlite.prepare("UPDATE technicians SET is_active=0 WHERE staff_id=?").run(row.staff_id);
    expect((await me(request("auth/me", {}, kept.token), f.env)).status).toBe(403);
    expect((await register(request("auth/register"))).status).toBe(403);
  });
  it("atomically limits repeated failed logins and validates PIN/body formats", async () => {
    const f = fixture();
    for (let i = 0; i < 10; i++) expect((await login(request("auth/login", { staff_id: "001234", pin: "9999" }, ""), f.env)).status).toBe(401);
    expect((await login(request("auth/login", { staff_id: "001234", pin: "9999" }, ""), f.env)).status).toBe(429);
    expect((await login(request("auth/login", { staff_id: [], pin: "9999" }, ""), f.env)).status).toBe(400);
  });
  it("derives a four-digit initial PIN including leading zeros", () => {
    expect(temporaryPin("OHCS-120007")).toBe("0007"); expect(() => temporaryPin("ABC123")).toThrow();
  });
  it("migrates the previous schema without touching users and matches fresh schema columns", () => {
    const old = new DatabaseSync(":memory:"); databases.push(old);
    old.exec(readFileSync(new URL("../src/db/baseline-2026-09-30.sql", import.meta.url), "utf8"));
    old.exec("INSERT INTO technicians(id,name,role,password_hash) VALUES ('legacy','Legacy','admin','legacy-hash')");
    old.exec(readFileSync(new URL("../migrations/0002_staff_onboarding.sql", import.meta.url), "utf8"));
    expect(old.prepare("SELECT password_hash,staff_id,must_change_pin FROM technicians WHERE id='legacy'").get()).toMatchObject({ password_hash: "legacy-hash", staff_id: null, must_change_pin: 0 });
    const fresh = fixture().sqlite;
    expect(old.prepare("PRAGMA table_info(technicians)").all().map(r => r.name).sort()).toEqual(fresh.prepare("PRAGMA table_info(technicians)").all().map(r => r.name).sort());
  });
  it("rolls back the entire import if an insert fails", async () => {
    const f = fixture(); f.sqlite.exec("CREATE TRIGGER block_test BEFORE INSERT ON technicians WHEN NEW.staff_id='009999' BEGIN SELECT RAISE(ABORT,'test failure'); END");
    await expect(importStaff(request("staff-import/commit", { rows: [row, { ...row, staff_id: "009999" }] }), f.env, true)).rejects.toThrow();
    expect(f.sqlite.prepare("SELECT count(*) n FROM technicians").get()!.n).toBe(1);
  });
});
describe("staff workbook", () => {
  it("contains no imported examples and preserves textual Staff IDs and optional contact fields", async () => {
    const wb = new Workbook(); await wb.xlsx.load(new Uint8Array(await createStaffTemplate()).buffer);
    expect(wb.getWorksheet("Staff")!.getCell("A2").value).toBeNull();
    wb.getWorksheet("Staff")!.getRow(2).values = ["001234", "Test officer", "Officer", "Member", "", "0240000000"];
    const rows = await parseStaffTemplate(new Uint8Array(await wb.xlsx.writeBuffer()).buffer);
    expect(rows[0]?.staff_id).toBe("001234"); expect(rows[0]?.phone).toBe("0240000000");
    wb.getWorksheet("Staff")!.getCell("A2").value = { formula: '"001234"' };
    await expect(parseStaffTemplate(new Uint8Array(await wb.xlsx.writeBuffer()).buffer)).rejects.toThrow("plain text");
  });
});
