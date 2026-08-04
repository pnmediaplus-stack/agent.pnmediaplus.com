import type { GateStatus } from "@/types/state";

export type Gate = {
  id: string;
  organization_id: string;
  gate_key: string;
  canonical_name: string;
  gate_kind: string;
  state: GateStatus | string;
  owner_department_id: string;
  applies_to_entity_type: string;
  required_verdicts: string[];
  is_blocking: boolean;
  rule_summary: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
};
