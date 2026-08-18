import type { LifecycleState } from "@/types/state";
import { canTransition } from "@/lib/state-machine";

export function requiresPublishScope(body: string) {
  const normalized = body.toLowerCase();
  // Check explicit keywords or a #data reference that might contain the scope
  const hasExplicitPageScope =
    /integration[_\s-]?key\b/.test(normalized) ||
    /#integration[_\s-]?key[_\s-]?\w+/.test(normalized);

  return !hasExplicitPageScope;
}

export function requiresCampaignScope(body: string) {
  const normalized = body.toLowerCase();
  // Only explicit department scope markers are accepted here.
  // Natural language like "phòng ban marketing" must be rejected upstream.
  const hasScope =
    /department[_\s-]?id\b\s*[:=]/.test(normalized) ||
    /department[_\s-]?name\b\s*[:=]/.test(normalized) ||
    /dept[_\s-]?id\b\s*[:=]/.test(normalized) ||
    /dept[_\s-]?name\b\s*[:=]/.test(normalized) ||
    /#department:[a-z0-9_-]+/.test(normalized);

  return !hasScope;
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
