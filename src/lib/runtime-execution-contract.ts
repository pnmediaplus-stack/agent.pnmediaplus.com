import type {
  RuntimeExecutionActorType,
  RuntimeExecutionEvent,
  RuntimeExecutionEventType,
  RuntimeExecutionState,
  RuntimeRetryState
} from "@/types/runtime";

export const RUNTIME_EXECUTION_EVENT_TYPES: RuntimeExecutionEventType[] = [
  "EXECUTION_REQUESTED",
  "EXECUTION_ACCEPTED",
  "EXECUTION_STARTED",
  "NODE_STARTED",
  "NODE_SUCCEEDED",
  "NODE_FAILED",
  "RETRY_SCHEDULED",
  "RETRY_EXHAUSTED",
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "EXECUTION_BLOCKED",
  "RECEIPT_ISSUED",
  "AUDIT_EVENT_RECORDED",
  "METRICS_SNAPSHOT_CAPTURED"
];

const RUNTIME_EXECUTION_STATES: RuntimeExecutionState[] = [
  "pending",
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked"
];

const RUNTIME_RETRY_STATES: RuntimeRetryState[] = [
  "not_applicable",
  "retry_available",
  "retry_scheduled",
  "retry_exhausted",
  "blocked"
];

const RUNTIME_ACTOR_TYPES: RuntimeExecutionActorType[] = ["N8N", "SYSTEM", "SERVICE"];

export type RuntimeContractValidationResult =
  | {
      ok: true;
      event: RuntimeExecutionEvent;
    }
  | {
      ok: false;
      status: 400 | 403;
      code: string;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function hasRawSecretMaterial(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.trim();
    return /^Bearer\s+/i.test(normalized) || /^sk-[A-Za-z0-9_-]{12,}/.test(normalized);
  }

  if (Array.isArray(value)) return value.some(hasRawSecretMaterial);
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = key.toLowerCase();
    const forbiddenKey =
      normalizedKey === "authorization" ||
      normalizedKey === "api_key" ||
      normalizedKey === "apikey" ||
      normalizedKey === "access_token" ||
      normalizedKey === "refresh_token" ||
      normalizedKey === "secret" ||
      normalizedKey === "password" ||
      normalizedKey === "private_key" ||
      normalizedKey === "raw_key" ||
      normalizedKey === "lease_token" ||
      normalizedKey === "reference_token";

    return forbiddenKey || hasRawSecretMaterial(nested);
  });
}

function validateIsoDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateRuntimeExecutionEvent(input: unknown): RuntimeContractValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_JSON",
      message: "Runtime event body must be a JSON object."
    };
  }

  if (hasRawSecretMaterial(input)) {
    return {
      ok: false,
      status: 403,
      code: "RUNTIME_EVENT_SECRET_MATERIAL_REJECTED",
      message: "Runtime event rejected because webhook payload appears to contain secret material."
    };
  }

  const eventId = readString(input, "event_id");
  const idempotencyKey = readString(input, "idempotency_key");
  const traceId = readString(input, "trace_id");
  const workflowRunId = readString(input, "workflow_run_id");
  const workflowRef = readString(input, "workflow_ref");
  const eventType = readString(input, "event_type") as RuntimeExecutionEventType;
  const executionState = readString(input, "execution_state") as RuntimeExecutionState;
  const actorType = readString(input, "actor_type").toUpperCase() as RuntimeExecutionActorType;
  const actorRef = readString(input, "actor_ref");
  const emittedAt = readString(input, "emitted_at");
  const retryState = readString(input, "retry_state") as RuntimeRetryState;
  const latencyMs = readOptionalNumber(input, "latency_ms");
  const payload = input.payload;

  if (!eventId || !idempotencyKey || !traceId || !workflowRunId || !workflowRef || !eventType || !executionState || !actorType || !actorRef || !emittedAt) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_MISSING_REQUIRED_REFS",
      message: "event_id, idempotency_key, trace_id, workflow_run_id, workflow_ref, event_type, execution_state, actor_type, actor_ref, and emitted_at are required."
    };
  }

  if (!RUNTIME_EXECUTION_EVENT_TYPES.includes(eventType)) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_UNKNOWN_TYPE",
      message: "Runtime event type is not approved for Phase 5 ingress."
    };
  }

  if (!RUNTIME_EXECUTION_STATES.includes(executionState)) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_EXECUTION_STATE",
      message: "Runtime execution_state is not approved."
    };
  }

  if (retryState && !RUNTIME_RETRY_STATES.includes(retryState)) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_RETRY_STATE",
      message: "Runtime retry_state is not approved."
    };
  }

  if (!RUNTIME_ACTOR_TYPES.includes(actorType)) {
    return {
      ok: false,
      status: 403,
      code: "RUNTIME_EVENT_FORBIDDEN_ACTOR",
      message: "Runtime events may only be emitted by N8N, SYSTEM, or SERVICE actors."
    };
  }

  if (latencyMs !== null && latencyMs !== undefined && (latencyMs < 0 || !Number.isFinite(latencyMs))) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_LATENCY",
      message: "latency_ms must be a non-negative number when provided."
    };
  }

  if (validateIsoDate(emittedAt) === null) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_EMITTED_AT",
      message: "emitted_at must be a valid ISO timestamp."
    };
  }

  if (payload !== undefined && !isRecord(payload)) {
    return {
      ok: false,
      status: 400,
      code: "RUNTIME_EVENT_INVALID_PAYLOAD",
      message: "payload must be an object when provided."
    };
  }

  return {
    ok: true,
    event: {
      event_id: eventId,
      idempotency_key: idempotencyKey,
      trace_id: traceId,
      workflow_run_id: workflowRunId,
      n8n_execution_id: readNullableString(input, "n8n_execution_id"),
      workflow_ref: workflowRef,
      request_ref: readNullableString(input, "request_ref"),
      task_ref: readNullableString(input, "task_ref"),
      event_type: eventType,
      execution_state: executionState,
      ...(retryState ? { retry_state: retryState } : {}),
      actor_type: actorType,
      actor_ref: actorRef,
      ...(latencyMs === undefined ? {} : { latency_ms: latencyMs }),
      error_summary: readNullableString(input, "error_summary"),
      ...(payload === undefined ? {} : { payload }),
      emitted_at: emittedAt
    }
  };
}
