import { Workbook, type Cell } from "exceljs";
import { checkZip } from "./team-workbook";
export interface StaffImportRow { staff_id: string; name: string; staff_category: string; role: string; email: string; phone: string }
export interface StaffCredential { staff_id: string; name: string; temporary_pin: string }
const headers = ["Staff ID", "Full name", "Staff category", "System access", "Email (optional)", "Phone (optional)"];
const keys: (keyof StaffImportRow)[] = ["staff_id", "name", "staff_category", "role", "email", "phone"];
export async function createStaffTemplate(): Promise<Uint8Array> {
  const wb = new Workbook(); wb.creator = "OHCS RSIMD-ITEMS";
  const guide = wb.addWorksheet("Instructions"); guide.columns = [{ width: 28 }, { width: 100 }];
  guide.addRows([
    ["STAFF ACCOUNT TEMPLATE", "Fill Staff, then upload under Administration > Staff accounts."],
    ["Required details", "Staff ID, full name and category. Copy the official Staff ID exactly, including any leading zeros; it must contain at least four digits. Do not invent IDs or enter PINs."],
    ["Staff category", "Technician or Officer. This describes participation, not permissions."],
    ["System access", "Member: participates in the exercise. Report officer: can generate reports. Leave blank for Member. Admin access is assigned individually."],
    ["How to upload", "Up to 50 staff per file. Fill one row per person. Preview the upload and resolve errors before creating accounts. Existing identical accounts are skipped; no accounts are overwritten."],
    ["Existing users", "Add Staff IDs to existing email accounts using Edit first. Do not create another account for the same person."],
    ["First sign-in", "The temporary PIN is the last four numeric digits of the Staff ID (including leading zeros). Staff can choose a new PIN or keep their initial PIN at first login. ITEMS PINs are separate from SmartGate/VMS."],
    ["EXAMPLE ONLY", "Staff ID: EXAMPLE-1001 | Full name: Example officer | Staff category: Officer | System access: Member. Do not copy this example into Staff."],
  ]);
  guide.eachRow(row => { row.height = 55; row.eachCell(c => { c.font = { name: "Arial", size: 11 }; c.alignment = { vertical: "top", wrapText: true }; }); });
  const staff = wb.addWorksheet("Staff", { views: [{ state: "frozen", ySplit: 1 }] });
  staff.columns = headers.map((_, i) => ({ width: [24, 36, 22, 24, 35, 25][i], style: { numFmt: "@" } }));
  staff.addRow(headers);
  for (let n = 1; n <= 51; n++) {
    staff.getRow(n).height = 30;
    headers.forEach((_, i) => { const c = staff.getCell(n, i + 1); c.font = { name: "Arial", size: 11, bold: n === 1, color: { argb: n === 1 ? "FFFFFFFF" : "FF17365D" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n === 1 ? "FF1A4D2E" : "FFFFF8E7" } }; });
    if (n > 1) for (const [col, values] of [[3, '"Technician,Officer"'], [4, '"Member,Report officer"']] as const) staff.getCell(n, col).dataValidation = { type: "list", allowBlank: true, formulae: [values], showErrorMessage: true, errorStyle: "stop", error: "Choose a listed value." };
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
function plain(cell: Cell): string {
  if (cell.value == null) return "";
  if (typeof cell.value === "string") return cell.value.trim();
  throw new Error(`Staff!${cell.address}: enter plain text. Staff IDs/phone numbers must keep leading zeros; formulas and links are not accepted.`);
}
export async function parseStaffTemplate(bytes: ArrayBuffer): Promise<StaffImportRow[]> {
  checkZip(bytes); const wb = new Workbook(); await wb.xlsx.load(bytes);
  const ws = wb.getWorksheet("Staff"); if (!ws) throw new Error("Use the downloaded Staff template.");
  if (ws.rowCount > 51 || ws.columnCount > 6) throw new Error("Use at most 50 staff rows and keep the original columns.");
  headers.forEach((h, i) => { if (plain(ws.getCell(1, i + 1)) !== h) throw new Error("Keep the original Staff column headings."); });
  const rows: StaffImportRow[] = [];
  for (let n = 2; n <= ws.rowCount; n++) {
    const values = headers.map((_, i) => plain(ws.getCell(n, i + 1)));
    if (!values.some(Boolean)) continue;
    if (n !== rows.length + 2) throw new Error("Keep completed staff rows together without blank gaps.");
    rows.push(Object.fromEntries(keys.map((key, i) => [key, values[i]])) as unknown as StaffImportRow);
  }
  if (!rows.length) throw new Error("Enter at least one staff member on the Staff sheet.");
  return rows;
}
export async function credentialWorkbook(rows: StaffCredential[]): Promise<Uint8Array> {
  const wb = new Workbook(); const sheet = wb.addWorksheet("Private sign-in details");
  sheet.columns = [{ width: 24 }, { width: 40 }, { width: 20 }, { width: 65 }];
  sheet.addRow(["Staff ID", "Name", "Temporary PIN", "Instructions"]);
  rows.forEach(r => sheet.addRow([r.staff_id, r.name, r.temporary_pin, "Sign in to ITEMS, then set a different 4–6 digit PIN. Give each person only their own details."]));
  sheet.eachRow(row => row.eachCell(c => { c.numFmt = "@"; c.font = { name: "Arial", size: 11 }; c.alignment = { wrapText: true }; }));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
