export interface FormRoom { entity: string; room: string; date: string; mode: string; status: string; notes: string }
export interface FormDevice {
  entity: string; room: string; date: string; reference: string; type: string; makeModel: string;
  before: string; checks: string; work: string; after: string; finalTest: string;
  outstanding: string; recommendation: string; officer: string;
}
export interface TeamForm {
  version: number; id: string; year: number; quarter: number; team: string; members: string;
  challenges: string; recommendations: string; helpdesk: string; rooms: FormRoom[]; devices: FormDevice[];
}
export interface FormPreview {
  revision?: boolean; expectedHash?: string;
  valid: boolean; duplicate?: boolean; saved?: boolean; form?: TeamForm;
  errors: { location: string; message: string }[]; warnings?: string[];
}
