import "server-only";

import type {
  Phase4AuditEvent,
  Phase4DashboardLoadResult,
  Phase4ExecutionReceipt,
  Phase4ExecutionState,
  Phase4ExecutionTrace,
  Phase4Metric,
  Phase4MetricsSnapshot,
  Phase4RetryState
} from "@/types/phase4";

const PHASE4_SCHEMA = "public";
const PENDING = "pending / incomplete";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type SupabaseViewResult<T> = {
  data: T[];
  error?: string;
};

type Phase4ExecutionTraceRow = {
  trace_id: string;
  request_ref: string | null;
  workflow_ref: string | null;
  workflow_run_id?: string | null;
  n8n_execution_id?: string | null;
  task_ref: string | null;
  receipt_ref: string | null;
  current_state: string | null;
  queue_state: string | null;
  retry_state: string | null;
  attempt_count?: number | string | null;
  max_attempts?: number | string | null;
  latency_ms: number | string | null;
  started_at: string | null;
  finished_at: string | null;
  error_summary: string | null;
  last_event_at?: string | null;
};

type Phase4ExecutionReceiptRow = {
  receipt_ref: string;
  trace_id: string | null;
  request_ref: string | null;
  receipt_kind: string | null;
  producer_ref: string | null;
  consumer_ref: string | null;
  status: string | null;
  result_ref: string | null;
  result_summary: string | null;
  created_at: string | null;
  sealed_at: string | null;
};

type Phase4RetryStatusRow = {
  retry_id: string;
  trace_id: string | null;
  request_ref: string | null;
  workflow_ref: string | null;
  retry_state: string | null;
  attempt_count: number | string | null;
  max_attempts: number | string | null;
  next_retry_at: string | null;
  last_retry_at: string | null;
  last_error_summary: string | null;
  retry_policy_ref: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Phase4AuditEventRow = {
  audit_event_id: string;
  trace_id: string | null;
  request_ref: string | null;
  event_type: string | null;
  actor_type: string | null;
  actor_ref: string | null;
  entity_type: string | null;
  entity_ref: string | null;
  summary: string | null;
  created_at: string | null;
};

type Phase4MetricsSnapshotRow = {
  success_rate_pct: number | string | null;
  latency_ms_avg: number | string | null;
  queue_depth: number | string | null;
  retry_pressure: number | string | null;
  total_traces: number | string | null;
  successful_traces: number | string | null;
  blocked_traces: number | string | null;
  load_state: string | null;
  captured_at: string | null;
  window_start: string | null;
  window_end: string | null;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeExecutionState(value: unknown): Phase4ExecutionState {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized === "pending" ||
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "blocked"
  ) {
    return normalized;
  }

  return "blocked";
}

function normalizeRetryState(value: unknown): Phase4RetryState {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized === "not_applicable" ||
    normalized === "retry_available" ||
    normalized === "retry_scheduled" ||
    normalized === "retry_exhausted" ||
    normalized === "blocked"
  ) {
    return normalized;
  }

  return "blocked";
}

function stringOrPending(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : PENDING;
}

function formatPercent(value: number | null) {
  return value === null ? PENDING : `${value}%`;
}

function formatMilliseconds(value: number | null) {
  if (value === null) return PENDING;
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatCount(value: number | null) {
  return value === null ? PENDING : String(value);
}

async function fetchPhase4View<T>(view: string, select: string, orderBy?: string, limit?: number): Promise<SupabaseViewResult<T>> {
  const config = getSupabaseConfig();

  if (!config) {
    return { data: [], error: "SUPABASE_ENV_MISSING" };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${view}`);
    endpoint.searchParams.set("select", select);
    if (orderBy) endpoint.searchParams.set("order", orderBy);
    if (typeof limit === "number") endpoint.searchParams.set("limit", String(limit));

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        "Accept-Profile": PHASE4_SCHEMA,
        "Content-Profile": PHASE4_SCHEMA
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        data: [],
        error: `Supabase ${view} query failed (${response.status}): ${body || response.statusText}`
      };
    }

    return { data: (await response.json()) as T[] };
  } catch (error) {
    return {
      data: [],
      error: `Supabase ${view} fetch failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function createPendingMetrics(snapshot: Phase4MetricsSnapshot | null): Phase4Metric[] {
  return [
    {
      id: "phase4_metric_success_rate",
      labelKey: "phase4.metric.successRate",
      value: formatPercent(snapshot?.successRatePct ?? null),
      state: snapshot?.successRatePct === null || !snapshot ? "blocked" : "succeeded"
    },
    {
      id: "phase4_metric_latency",
      labelKey: "phase4.metric.latency",
      value: formatMilliseconds(snapshot?.latencyMsAvg ?? null),
      state: snapshot?.latencyMsAvg === null || !snapshot ? "blocked" : "succeeded"
    },
    {
      id: "phase4_metric_queue_depth",
      labelKey: "phase4.metric.queueDepth",
      value: formatCount(snapshot?.queueDepth ?? null),
      state: snapshot?.queueDepth === null || !snapshot ? "blocked" : "succeeded"
    },
    {
      id: "phase4_metric_retry_pressure",
      labelKey: "phase4.metric.retryPressure",
      value: formatCount(snapshot?.retryPressure ?? null),
      state: snapshot?.retryPressure === null || !snapshot ? "blocked" : "succeeded"
    }
  ];
}

function mapMetricsSnapshot(row: Phase4MetricsSnapshotRow | undefined): Phase4MetricsSnapshot | null {
  if (!row) return null;

  return {
    successRatePct: toNumber(row.success_rate_pct),
    latencyMsAvg: toNumber(row.latency_ms_avg),
    queueDepth: toNumber(row.queue_depth),
    retryPressure: toNumber(row.retry_pressure),
    totalTraces: toNumber(row.total_traces),
    successfulTraces: toNumber(row.successful_traces),
    blockedTraces: toNumber(row.blocked_traces),
    loadState: row.load_state ?? null,
    capturedAt: row.captured_at ?? null,
    windowStart: row.window_start ?? null,
    windowEnd: row.window_end ?? null
  };
}

export async function loadPhase4ObservabilityData(): Promise<Phase4DashboardLoadResult> {
  const [
    tracesResult,
    receiptsResult,
    retryResult,
    auditResult,
    metricsResult
  ] = await Promise.all([
    fetchPhase4View<Phase4ExecutionTraceRow>(
      "phase4_execution_traces",
      "trace_id,request_ref,workflow_ref,workflow_run_id,n8n_execution_id,task_ref,receipt_ref,current_state,queue_state,retry_state,attempt_count,max_attempts,latency_ms,started_at,finished_at,error_summary,last_event_at",
      "last_event_at.desc",
      100
    ),
    fetchPhase4View<Phase4ExecutionReceiptRow>(
      "phase4_execution_receipts",
      "receipt_ref,trace_id,request_ref,receipt_kind,producer_ref,consumer_ref,status,result_ref,result_summary,created_at,sealed_at",
      "created_at.desc",
      100
    ),
    fetchPhase4View<Phase4RetryStatusRow>(
      "phase4_retry_status",
      "retry_id,trace_id,request_ref,workflow_ref,retry_state,attempt_count,max_attempts,next_retry_at,last_retry_at,last_error_summary,retry_policy_ref,created_at,updated_at",
      "updated_at.desc",
      100
    ),
    fetchPhase4View<Phase4AuditEventRow>(
      "phase4_execution_audit_events",
      "audit_event_id,trace_id,request_ref,event_type,actor_type,actor_ref,entity_type,entity_ref,summary,created_at",
      "created_at.desc",
      100
    ),
    fetchPhase4View<Phase4MetricsSnapshotRow>(
      "phase4_execution_metrics",
      "success_rate_pct,latency_ms_avg,queue_depth,retry_pressure,total_traces,successful_traces,blocked_traces,load_state,captured_at,window_start,window_end",
      "captured_at.desc",
      1
    )
  ]);

  const errors = [
    tracesResult.error,
    receiptsResult.error,
    retryResult.error,
    auditResult.error,
    metricsResult.error
  ].filter(Boolean) as string[];

  const metricsSnapshot = mapMetricsSnapshot(metricsResult.data[0]);
  const metrics = createPendingMetrics(metricsSnapshot);

  if (errors.length) {
    return {
      state: "blocked",
      reason: errors[0],
      data: {
        metrics,
        metricsSnapshot,
        traces: [],
        receipts: [],
        auditEvents: []
      }
    };
  }

  const retryByTraceId = new Map(
    retryResult.data
      .filter((row) => typeof row.trace_id === "string" && row.trace_id.trim())
      .map((row) => [row.trace_id as string, row])
  );
  const receiptByTraceId = new Map(
    receiptsResult.data
      .filter((row) => typeof row.trace_id === "string" && row.trace_id.trim())
      .map((row) => [row.trace_id as string, row])
  );

  const traces: Phase4ExecutionTrace[] = tracesResult.data.map((row) => {
    const retry = retryByTraceId.get(row.trace_id);
    const receipt = receiptByTraceId.get(row.trace_id);

    return {
      id: row.trace_id,
      requestRef: stringOrPending(row.request_ref),
      workflowRef: stringOrPending(row.workflow_ref),
      taskRef: stringOrPending(row.task_ref),
      receiptRef: stringOrPending(row.receipt_ref ?? receipt?.receipt_ref),
      currentState: normalizeExecutionState(row.current_state),
      retryState: normalizeRetryState(retry?.retry_state ?? row.retry_state),
      maxAttempts: toNumber(retry?.max_attempts ?? row.max_attempts ?? null),
      nextRetryAt: retry?.next_retry_at ?? null,
      retryPolicyRef: retry?.retry_policy_ref ?? null,
      latencyMs: toNumber(row.latency_ms),
      queueState: stringOrPending(row.queue_state),
      errorSummary: row.error_summary ?? retry?.last_error_summary ?? null,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    };
  });

  const receipts: Phase4ExecutionReceipt[] = receiptsResult.data.map((row) => ({
    receiptRef: row.receipt_ref,
    traceId: stringOrPending(row.trace_id),
    requestRef: stringOrPending(row.request_ref),
    receiptKind: stringOrPending(row.receipt_kind),
    producerRef: stringOrPending(row.producer_ref),
    consumerRef: stringOrPending(row.consumer_ref),
    status: stringOrPending(row.status),
    resultRef: row.result_ref,
    resultSummary: row.result_summary,
    createdAt: row.created_at,
    sealedAt: row.sealed_at
  }));

  const auditEvents: Phase4AuditEvent[] = auditResult.data.map((row) => ({
    id: row.audit_event_id,
    traceId: stringOrPending(row.trace_id),
    eventType: stringOrPending(row.event_type),
    actorRef: stringOrPending(row.actor_ref),
    summary: row.summary ?? PENDING,
    createdAt: row.created_at ?? PENDING
  }));

  return {
    state: metricsSnapshot ? "ready" : "blocked",
    reason: metricsSnapshot ? "" : "PHASE4_EXECUTION_METRICS_EMPTY",
    data: {
      metrics,
      metricsSnapshot,
      traces,
      receipts,
      auditEvents
    }
  };
}
