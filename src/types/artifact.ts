import type { ArtifactStatus } from "@/types/state";

export type Artifact = {
  id: string;
  title: string;
  type: "brief" | "prompt" | "asset" | "qa-note" | "workflow";
  departmentId: string;
  state: ArtifactStatus;
  updatedAt: string;
  version: string;
};
