export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  ENVIRONMENT: string;
}

export interface OrgEntityRow {
  id: string;
  name: string;
  code: string;
  type: "directorate" | "unit" | "secretariat";
  rooms: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentRow {
  id: string;
  asset_tag: string;
  type: "desktop" | "laptop" | "printer" | "scanner" | "router" | "switch" | "access_point" | "cctv" | "ups" | "other";
  make: string | null;
  model: string | null;
  processor: string | null;
  serial_number: string | null;
  org_entity_id: string;
  room_number: string | null;
  status: "active" | "faulty" | "decommissioned" | "under_repair";
  installed_date: string | null;
  notes: string | null;
  os_version: string | null;
  processor_gen: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceCategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface TechnicianRow {
  id: string;
  name: string;
  role: "technician" | "lead" | "admin";
  email: string | null;
  phone: string | null;
  assigned_entities: string;
  is_active: number;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLogRow {
  id: string;
  equipment_id: string | null;
  technician_id: string;
  org_entity_id: string;
  maintenance_type: "condition_based" | "routine" | "corrective" | "emergency" | "predictive";
  category_id: string | null;
  room_number: string | null;
  description: string;
  resolution: string | null;
  status: "pending" | "in_progress" | "completed" | "escalated";
  photo_urls: string;
  logged_date: string;
  quarter: number;
  month: number;
  year: number;
  created_offline: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  title: string;
  quarter: number;
  year: number;
  file_url: string | null;
  file_size: number | null;
  generated_by: string | null;
  status: "draft" | "generated" | "reviewed" | "approved";
  ai_model: string | null;
  generation_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportItemRow {
  id: string;
  report_id: string;
  type: "challenge" | "recommendation";
  description: string;
  category: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  auto_generated: number;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

export interface AuthSession {
  technician_id: string;
  role: "technician" | "lead" | "admin";
  name: string;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  session: AuthSession;
}
