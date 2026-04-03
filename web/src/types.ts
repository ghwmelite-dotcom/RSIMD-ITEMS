export interface Technician {
  id: string;
  name: string;
  role: "technician" | "lead" | "admin";
  email: string | null;
  phone: string | null;
  assigned_entities: string[];
}

export interface OrgEntity {
  id: string;
  name: string;
  code: string;
  type: "directorate" | "unit" | "secretariat";
  rooms: string[];
  is_active: boolean;
}

export interface Equipment {
  id: string;
  asset_tag: string;
  type: string;
  make: string | null;
  model: string | null;
  processor: string | null;
  serial_number: string | null;
  org_entity_id: string;
  room_number: string | null;
  status: "active" | "faulty" | "decommissioned" | "under_repair";
  installed_date: string | null;
  notes: string | null;
}

export interface MaintenanceCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface MaintenanceLog {
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
  photo_urls: string[];
  logged_date: string;
  quarter: number;
  month: number;
  year: number;
}

export interface Report {
  id: string;
  title: string;
  quarter: number;
  year: number;
  file_url: string | null;
  status: "draft" | "generated" | "reviewed" | "approved";
  created_at: string;
}

export interface LoginResponse {
  token: string;
  technician: Technician;
}

export type UserRole = "technician" | "lead" | "admin";
