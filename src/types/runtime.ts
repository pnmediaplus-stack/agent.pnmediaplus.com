export type RuntimeExecutionEventType =
  | "EXECUTION_REQUESTED"
  | "EXECUTION_ACCEPTED"
  | "EXECUTION_STARTED"
  | "NODE_STARTED"
  | "NODE_SUCCEEDED"
  | "NODE_FAILED"
  | "RETRY_SCHEDULED"
  | "RETRY_EXHAUSTED"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED"
  | "EXECUTION_BLOCKED"
  | "RECEIPT_ISSUED"
  | "AUDIT_EVENT_RECORDED"
  | "METRICS_SNAPSHOT_CAPTURED";

export type RuntimeExecutionState = "pending" | "queued" | "running" | "succeeded" | "failed" | "blocked";

export type RuntimeRetryState =
  | "not_applicable"
  | "retry_available"
  | "retry_scheduled"
  | "retry_exhausted"
  | "blocked";

export type RuntimeExecutionActorType = "N8N" | "SYSTEM" | "SERVICE";

export type RuntimeExecutionEvent = {
  event_id: string;
  idempotency_key: string;
  trace_id: string;
  workflow_run_id: string;
  n8n_execution_id: string | null;
  workflow_ref: string;
  request_ref: string | null;
  task_ref: string | null;
  event_type: RuntimeExecutionEventType;
  execution_state: RuntimeExecutionState;
  retry_state?: RuntimeRetryState;
  actor_type: RuntimeExecutionActorType;
  actor_ref: string;
  latency_ms?: number | null;
  error_summary?: string | null;
  payload?: Record<string, unknown>;
  emitted_at: string;
};

export type RuntimeExecutionIngressEnvelope<TData = unknown> = {
  ok: boolean;
  route: "runtime-execution-event";
  status: number;
  message: string;
  data?: TData;
  error?: string;
  receivedAt: string;
};
