import type { WorkflowRunStatus } from "@/types/state";

export type WorkflowRun = {
  id: string;
  name: string;
  workflowKey: string;
  status: WorkflowRunStatus;
  startedAt: string;
  duration: string;
  target: string;
};
