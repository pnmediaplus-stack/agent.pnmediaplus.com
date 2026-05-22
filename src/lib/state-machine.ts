import type { LifecycleState } from "@/types/state";

export const allowedTransitions: Record<LifecycleState, LifecycleState[]> = {
  NOT_STARTED: ["DRAFT"],
  DRAFT: ["PARTIAL", "REVIEW", "HOLD"],
  PARTIAL: ["REVIEW", "HOLD"],
  REVIEW: ["PASS", "HOLD", "BLOCKED"],
  HOLD: ["READY_FOR_RECHECK", "BLOCKED"],
  READY_FOR_RECHECK: ["REVIEW"],
  PASS: ["APPROVED", "DEPRECATED"],
  BLOCKED: ["HOLD", "DEPRECATED"],
  APPROVED: ["DEPRECATED"],
  DEPRECATED: []
};

export function canTransition(from: LifecycleState, to: LifecycleState) {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: LifecycleState, to: LifecycleState) {
  if (!canTransition(from, to)) {
    throw new Error(`Forbidden transition: ${from} -> ${to}`);
  }
}
