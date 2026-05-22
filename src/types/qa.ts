import type { QAStatus } from "@/types/state";

export type QAReview = {
  id: string;
  artifactId: string;
  reviewer: string;
  status: QAStatus;
  notes: string;
  reviewedAt: string;
};
