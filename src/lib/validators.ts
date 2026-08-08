import type { ChatIntentType, LifecycleState } from "@/types/state";
import { canTransition } from "@/lib/state-machine";

export function inferChatIntent(body: string): ChatIntentType {
  const normalized = body.toLowerCase();

  if (normalized.includes("approve") || normalized.includes("reject") || normalized.includes("duyệt") || normalized.includes("từ chối")) {
    return "approve_or_reject";
  }

  if (
    normalized.includes("publish") ||
    normalized.includes("launch") ||
    normalized.includes("đăng bài") ||
    normalized.includes("xuất bản")
  ) {
    return "publish_content";
  }

  if (
    normalized.includes("campaign") ||
    normalized.includes("chiến dịch") ||
    normalized.includes("plan campaign") ||
    normalized.includes("lập kế hoạch")
  ) {
    return "plan_campaign";
  }

  if (
    normalized.includes("route department") ||
    normalized.includes("định tuyến phòng ban") ||
    normalized.includes("chuyển phòng ban") ||
    normalized.includes("giao việc") ||
    normalized.includes("chuyển việc") ||
    normalized.includes("phân công")
  ) {
    return "route_department";
  }

  if (normalized.includes("review") || normalized.includes("qa") || normalized.includes("kiểm tra")) {
    return "review_artifact";
  }

  if (normalized.includes("status") || normalized.includes("what's going on") || normalized.includes("trạng thái") || normalized.includes("tiến độ")) {
    return "request_status";
  }

  if (normalized.includes("task") || normalized.includes("create") || normalized.includes("tạo")) {
    return "create_content";
  }

  return "unknown";
}

export function requiresHumanApproval(body: string) {
  const normalized = body.toLowerCase();
  return normalized.includes("publish") || normalized.includes("launch") || normalized.includes("đăng bài") || normalized.includes("xuất bản");
}

export function requiresPublishScope(body: string) {
  const normalized = body.toLowerCase();
  // Check explicit keywords or a #data reference that might contain the scope
  const hasExplicitPageScope =
    /page[_\s-]?id\b/.test(normalized) ||
    /fanpage[_\s-]?id\b/.test(normalized) ||
    /page[_\s-]?name\b/.test(normalized) ||
    /fanpage[_\s-]?name\b/.test(normalized) ||
    /page\s*[:=]/.test(normalized) ||
    /fanpage\s*[:=]/.test(normalized) ||
    /#page[_\s-]?\w+/.test(normalized) ||
    /#fanpage[_\s-]?\w+/.test(normalized);

  return !hasExplicitPageScope;
}

export function requiresCampaignScope(body: string) {
  const normalized = body.toLowerCase();
  // Check for explicit department mention or @agent mention
  const hasScope =
    normalized.includes("phòng ban") ||
    normalized.includes("department") ||
    normalized.includes("agent") ||
    /@[a-z0-9_]+/.test(normalized); // @agent reference

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
