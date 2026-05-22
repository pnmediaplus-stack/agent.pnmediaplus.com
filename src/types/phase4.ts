export type Phase4LoadState = "blocked" | "ready";

export type Phase4ExecutionState = "pending" | "queued" | "running" | "succeeded" | "failed" | "blocked";

export type Phase4RetryState = "not_applicable" | "retry_available" | "retry_scheduled" | "retry_exhausted" | "blocked";

export type Phase4Metric = {
  id: string;
  labelKey: string;
  value: string;
  state: Phase4ExecutionState;
};

export type Phase4MetricsSnapshot = {
  successRatePct: number | null;
  latencyMsAvg: number | null;
  queueDepth: number | null;
  retryPressure: number | null;
  totalTraces: number | null;
  successfulTraces: number | null;
  blockedTraces: number | null;
  loadState: string | null;
  capturedAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
};

export type Phase4ExecutionTrace = {
  id: string;
  requestRef: string;
  workflowRef: string;
  taskRef: string;
  receiptRef: string;
  currentState: Phase4ExecutionState;
  retryState: Phase4RetryState;
  latencyMs: number | null;
  queueState: string;
  errorSummary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type Phase4ExecutionReceipt = {
  receiptRef: string;
  traceId: string;
  requestRef: string;
  receiptKind: string;
  producerRef: string;
  consumerRef: string;
  status: string;
  resultRef: string | null;
  resultSummary: string | null;
  createdAt: string | null;
  sealedAt: string | null;
};

export type Phase4AuditEvent = {
  id: string;
  traceId: string;
  eventType: string;
  actorRef: string;
  summary: string;
  createdAt: string;
};

export type Phase4DashboardData = {
  metrics: Phase4Metric[];
  metricsSnapshot: Phase4MetricsSnapshot | null;
  traces: Phase4ExecutionTrace[];
  receipts: Phase4ExecutionReceipt[];
  auditEvents: Phase4AuditEvent[];
};

export type Phase4DashboardLoadResult = {
  state: Phase4LoadState;
  reason: string;
  data: Phase4DashboardData;
};
