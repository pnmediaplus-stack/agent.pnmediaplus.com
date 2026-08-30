import type { ArtifactStatus } from "@/types/state";

export type Artifact = {
  id: string;
  organization_id: string;
  department_id: string;
  task_id: string | null;
  artifact_key: string;
  canonical_name: string;
  artifact_type: string;
  version_label: string;
  state: ArtifactStatus;
  creator_actor_type: string;
  creator_agent_id: string | null;
  creator_external_ref: string | null;
  qa_owner_id: string | null;
  final_authority_type: string | null;
  final_authority_agent_id: string | null;
  final_authority_external_ref: string | null;
  parent_artifact_id: string | null;
  evidence_notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
};

export type VisualAsset = {
  url: string;
  type: 'user_upload' | 'ai_generated' | 'reference' | string;
  source: string;
  batch_id: string;
};
