import type { QAStatus } from "@/types/state";

export type QAReview = {
  id: string;
  organization_id: string;
  artifact_version_id: string;
  task_id: string | null;
  reviewer_actor_type: string;
  reviewer_agent_id: string | null;
  reviewer_external_ref: string | null;
  verdict: QAStatus;
  notes: string | null;
  evidence_ref: string;
  created_at: string;
  updated_at: string;
};
