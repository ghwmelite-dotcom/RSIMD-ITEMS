export const API_BASE = "/api";

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
