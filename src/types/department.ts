import type { LifecycleState } from "@/types/state";

export type Department = {
  id: string;
  organization_id: string;
  department_key: string;
  canonical_name: string;
  description: string | null;
  state: LifecycleState;
  created_at: string;
  updated_at: string;
};
