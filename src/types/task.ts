import type { TaskStatus, ChatIntentType, LifecycleState } from "@/types/state";

export type Task = {
  id: string;
  organization_id: string;
  department_id: string;
  task_key: string;
  title: string;
  summary: string | null;
  state: LifecycleState;
  priority: number;
  requester_actor_type: string;
  requester_external_ref: string | null;
  owner_agent_id: string | null;
  created_at: string;
  updated_at: string;
};
