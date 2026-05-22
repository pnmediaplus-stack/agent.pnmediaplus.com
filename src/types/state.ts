export type LifecycleState =
  | "NOT_STARTED"
  | "DRAFT"
  | "PARTIAL"
  | "REVIEW"
  | "HOLD"
  | "READY_FOR_RECHECK"
  | "PASS"
  | "BLOCKED"
  | "APPROVED"
  | "DEPRECATED";

export type TaskStatus = LifecycleState | "OPEN" | "IN_PROGRESS" | "DONE";
export type ArtifactStatus = LifecycleState;
export type QAStatus = "PENDING" | "REVIEW" | "PASS" | "BLOCKED" | "HOLD";
export type GateStatus = "OPEN" | "REVIEW_REQUIRED" | "APPROVED" | "BLOCKED";
export type ApprovalStatus = "PENDING" | "REQUESTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type WorkflowRunStatus = "QUEUED" | "RUNNING" | "WAITING_ON_HUMAN" | "SUCCEEDED" | "FAILED";
export type ChatIntentType =
  | "create_content"
  | "review_artifact"
  | "check_governance"
  | "request_status"
  | "approve_or_reject"
  | "unknown";
