import type { ChatIntentType, LifecycleState } from "@/types/state";
import { canTransition } from "@/lib/state-machine";

export function inferChatIntent(body: string): ChatIntentType {
  const normalized = body.toLowerCase();
  if (normalized.includes("approve") || normalized.includes("reject")) return "approve_or_reject";
  if (normalized.includes("publish") || normalized.includes("launch")) return "check_governance";
  if (normalized.includes("review") || normalized.includes("qa")) return "review_artifact";
  if (normalized.includes("status") || normalized.includes("what's going on")) return "request_status";
  if (normalized.includes("task") || normalized.includes("create")) return "create_content";
  return "unknown";
}

export function requiresHumanApproval(body: string) {
  const normalized = body.toLowerCase();
  return normalized.includes("publish") || normalized.includes("launch");
}

export function isSafeStateTransition(from: string, to: string) {
  const states: LifecycleState[] = [
    "NOT_STARTED",
    "DRAFT",
    "PARTIAL",
    "REVIEW",
    "HOLD",
    "READY_FOR_RECHECK",
    "PASS",
    "BLOCKED",
    "APPROVED",
    "DEPRECATED"
  ];

  if (!states.includes(from as LifecycleState) || !states.includes(to as LifecycleState)) return false;
  return canTransition(from as LifecycleState, to as LifecycleState);
}
