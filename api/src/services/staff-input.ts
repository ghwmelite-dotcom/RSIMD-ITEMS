import { normalizeStaffId, validStaffId, temporaryPin } from "./staff-auth";
export interface StaffInput { staff_id: string; name: string; staff_category: "technician" | "officer"; role: "technician" | "lead" | "admin"; email: string; phone: string }
export function staffInput(value: unknown, allowAdmin = false): StaffInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A staff row is required");
  const row = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (row[key] == null) return "";
    if (typeof row[key] !== "string" || row[key].length > max || /[\u0000-\u001f]/.test(row[key])) throw new Error(`${key} must be plain text, up to ${max} characters`);
    return row[key].trim();
  };
  const staff_id = normalizeStaffId(text("staff_id", 40)), name = text("name", 150), category = text("staff_category", 20).toLowerCase();
  const access = text("role", 30).toLowerCase() || "member";
  const role = access === "member" ? "technician" : access === "report officer" ? "lead" : access;
  const email = text("email", 150).toLowerCase(), phone = text("phone", 40);
  if (!validStaffId(staff_id)) throw new Error("Staff ID is required (2–40 letters, digits, hyphens or slashes); keep leading zeros");
  temporaryPin(staff_id);
  if (!name) throw new Error("Full name is required");
  if (!["technician", "officer"].includes(category)) throw new Error("Staff category must be Technician or Officer");
  if (!["technician", "lead", ...(allowAdmin ? ["admin"] : [])].includes(role)) throw new Error("System access must be Member or Report officer; administrators are managed individually");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email or leave it blank");
  return { staff_id, name, staff_category: category as StaffInput["staff_category"], role: role as StaffInput["role"], email, phone };
}
