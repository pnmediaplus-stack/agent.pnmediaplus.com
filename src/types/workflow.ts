import type { WorkflowRunStatus } from "@/types/state";

export type WorkflowRun = {
  id: string;
  department_id: string;
  task_id: string | null;
  workflow_key: string;
  workflow_name: string;
  n8n_execution_id: string | null;
  run_status: WorkflowRunStatus;
  context_status?: string | null;
  context_last_error?: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};
