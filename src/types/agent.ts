import type { LifecycleState } from "@/types/state";

export type Agent = {
  id: string;
  organization_id: string;
  department_id: string;
  agent_key: string;
  canonical_name: string;
  role_code: string;
  authority_scope: 'READ_ONLY' | 'REVIEW_ONLY' | 'TASK_OWNER' | 'DEPARTMENT_OWNER' | 'SERVICE';
  state: LifecycleState;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};
