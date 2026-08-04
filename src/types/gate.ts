import type { GateStatus } from "@/types/state";

export type Gate = {
  id: string;
  organization_id: string;
  gate_type: string;
  status: GateStatus;
  owner_actor_type: string;
  owner_agent_id: string | null;
  owner_external_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
