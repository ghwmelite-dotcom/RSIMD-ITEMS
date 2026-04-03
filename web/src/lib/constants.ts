export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const COLORS = {
  green: "#006B3F",
  gold: "#FCD116",
  red: "#CE1126",
  black: "#1a1a1a",
} as const;

export const MAINTENANCE_TYPES = [
  { value: "condition_based", label: "Condition-Based" },
  { value: "routine", label: "Routine" },
  { value: "corrective", label: "Corrective" },
  { value: "emergency", label: "Emergency" },
  { value: "predictive", label: "Predictive" },
] as const;

export const EQUIPMENT_TYPES = [
  { value: "desktop", label: "Desktop" },
  { value: "laptop", label: "Laptop" },
  { value: "printer", label: "Printer" },
  { value: "scanner", label: "Scanner" },
  { value: "router", label: "Router" },
  { value: "switch", label: "Switch" },
  { value: "access_point", label: "Access Point" },
  { value: "cctv", label: "CCTV" },
  { value: "ups", label: "UPS" },
  { value: "other", label: "Other" },
] as const;

export const EQUIPMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "faulty", label: "Faulty" },
  { value: "under_repair", label: "Under Repair" },
  { value: "decommissioned", label: "Decommissioned" },
] as const;

export const OS_OPTIONS = [
  { value: "Windows 10 Home", label: "Windows 10 Home" },
  { value: "Windows 10 Pro", label: "Windows 10 Pro" },
  { value: "Windows 11 Home", label: "Windows 11 Home" },
  { value: "Windows 11 Pro", label: "Windows 11 Pro" },
  { value: "Ubuntu 22.04", label: "Ubuntu 22.04" },
  { value: "Ubuntu 24.04", label: "Ubuntu 24.04" },
  { value: "Other", label: "Other" },
] as const;

export const PROCESSOR_GEN_OPTIONS = [
  { value: "Pentium", label: "Pentium" },
  { value: "Celeron", label: "Celeron" },
  { value: "Core 2 Duo", label: "Core 2 Duo" },
  { value: "4th Gen Intel", label: "4th Gen Intel (Haswell)" },
  { value: "6th Gen Intel", label: "6th Gen Intel (Skylake)" },
  { value: "7th Gen Intel", label: "7th Gen Intel (Kaby Lake)" },
  { value: "8th Gen Intel", label: "8th Gen Intel (Coffee Lake)" },
  { value: "10th Gen Intel", label: "10th Gen Intel" },
  { value: "12th Gen Intel", label: "12th Gen Intel" },
  { value: "13th Gen Intel", label: "13th Gen Intel" },
  { value: "AMD Ryzen 3", label: "AMD Ryzen 3" },
  { value: "AMD Ryzen 5", label: "AMD Ryzen 5" },
  { value: "AMD Ryzen 7", label: "AMD Ryzen 7" },
  { value: "Other", label: "Other" },
] as const;
