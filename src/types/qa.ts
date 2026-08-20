import type { QAStatus } from "@/types/state";

export type BaseQAReview = {
  id: string;
  organization_id: string;
  verdict: QAStatus;
  notes: string | null;
  evidence_ref: string;
  created_at: string;
  updated_at: string;
};

export type Phase1QAReview = BaseQAReview & {
  phase: 'phase1';
  artifact_version_id: string;
  task_id: string | null;
  reviewer_actor_type: string;
  reviewer_agent_id: string | null;
  reviewer_external_ref: string | null;
};

export type Phase2QAReview = BaseQAReview & {
  phase: 'phase2';
  content_item_id: string;
  artifact_version_id: string | null;
  agent_task_id: string | null;
  reviewer_ref: string;
  average_score: number | null;
  overclaim_risk: number | null;
};

export type QAReview = Phase1QAReview | Phase2QAReview;
