export type AuditLog = {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  agent_id: string | null;
  external_ref: string | null;
  action_type: string;
  metadata: any;
  created_at: string;
  updated_at: string;
};
