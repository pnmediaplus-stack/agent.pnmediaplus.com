import type { ApprovalStatus } from "@/types/state";

export type Approval = {
  id: string;
  targetType: "task" | "artifact" | "workflow";
  targetId: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
};
