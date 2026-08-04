import type { ApprovalStatus } from "@/types/state";

export type Approval = {
  id: string;
  organization_id: string;
  gate_id: string;
  entity_type: string;
  entity_id: string;
  approval_status: ApprovalStatus;
  verdict: string | null;
  requested_by_actor_type: string;
  requested_by_agent_id: string | null;
  requested_by_external_ref: string | null;
  requested_at: string;
  approver_actor_type: string | null;
  approver_agent_id: string | null;
  approver_external_ref: string | null;
  decided_at: string | null;
  evidence_ref: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
