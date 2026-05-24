import "server-only";

const PUBLIC_SCHEMA = "public";

type JsonObject = Record<string, unknown>;

export type Phase066ClaimBoundaryEvidence = {
  surface_key: string | null;
  source_department_name: string | null;
  target_department_name: string | null;
  source_handoff_id: string | null;
  claim_boundary: string | null;
  claim_boundary_ref: string | null;
  claim_boundary_evidence_ref: string | null;
  qa_boundary_evidence_ref: string | null;
  monitoring_trace_ref: string | null;
  source_of_truth: string | null;
  evidence_state: string | null;
};

export type Phase066MonitoringTraceRef = {
  monitoring_trace_ref: string | null;
  receipt_ref: string | null;
  workflow_ref: string | null;
  task_ref: string | null;
  current_state: string | null;
  retry_state: string | null;
  queue_state: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type Phase066Snapshot = {
  flow_name: string | null;
  claim_boundary_evidence: Phase066ClaimBoundaryEvidence[];
  monitoring_trace_refs: Phase066MonitoringTraceRef[];
};

export type Phase066SnapshotLoadResult =
  | {
      state: "ready";
      reason: "PHASE066_PUBLIC_SNAPSHOT_LOADED";
      data: Phase066Snapshot;
    }
  | {
      state: "blocked";
      reason: string;
      data: null;
    };

type SupabaseConfig = {
  url: string;
  key: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!url || !key) return null;
  return { url, key };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeArray<T>(value: unknown, normalizer: (item: JsonObject) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isJsonObject).map(normalizer);
}

function normalizeClaimBoundaryEvidence(value: JsonObject): Phase066ClaimBoundaryEvidence {
  return {
    surface_key: stringField(value.surface_key),
    source_department_name: stringField(value.source_department_name),
    target_department_name: stringField(value.target_department_name),
    source_handoff_id: stringField(value.source_handoff_id),
    claim_boundary: stringField(value.claim_boundary),
    claim_boundary_ref: stringField(value.claim_boundary_ref),
    claim_boundary_evidence_ref: stringField(value.claim_boundary_evidence_ref),
    qa_boundary_evidence_ref: stringField(value.qa_boundary_evidence_ref),
    monitoring_trace_ref: stringField(value.monitoring_trace_ref),
    source_of_truth: stringField(value.source_of_truth),
    evidence_state: stringField(value.evidence_state)
  };
}

function normalizeMonitoringTraceRef(value: JsonObject): Phase066MonitoringTraceRef {
  return {
    monitoring_trace_ref: stringField(value.monitoring_trace_ref),
    receipt_ref: stringField(value.receipt_ref),
    workflow_ref: stringField(value.workflow_ref),
    task_ref: stringField(value.task_ref),
    current_state: stringField(value.current_state),
    retry_state: stringField(value.retry_state),
    queue_state: stringField(value.queue_state),
    started_at: stringField(value.started_at),
    finished_at: stringField(value.finished_at)
  };
}

function normalizeSnapshot(value: unknown): Phase066Snapshot | null {
  if (!isJsonObject(value)) return null;

  return {
    flow_name: stringField(value.flow_name),
    claim_boundary_evidence: normalizeArray(value.claim_boundary_evidence, normalizeClaimBoundaryEvidence),
    monitoring_trace_refs: normalizeArray(value.monitoring_trace_refs, normalizeMonitoringTraceRef)
  };
}

export async function loadPhase066Snapshot(): Promise<Phase066SnapshotLoadResult> {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      state: "blocked",
      reason: "PHASE066_PUBLIC_SNAPSHOT_ENV_MISSING",
      data: null
    };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/department_governance_phase066_snapshot`);
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Profile": PUBLIC_SCHEMA,
        "Content-Profile": PUBLIC_SCHEMA
      },
      body: "{}"
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        state: "blocked",
        reason: `PHASE066_PUBLIC_SNAPSHOT_RPC_FAILED:${response.status}:${body || response.statusText}`,
        data: null
      };
    }

    const snapshot = normalizeSnapshot(await response.json());

    if (!snapshot) {
      return {
        state: "blocked",
        reason: "PHASE066_PUBLIC_SNAPSHOT_INVALID_SHAPE",
        data: null
      };
    }

    if (snapshot.flow_name !== "Marketing-Media-Operations") {
      return {
        state: "blocked",
        reason: "PHASE066_PUBLIC_SNAPSHOT_FLOW_NAME_INVALID",
        data: null
      };
    }

    return {
      state: "ready",
      reason: "PHASE066_PUBLIC_SNAPSHOT_LOADED",
      data: snapshot
    };
  } catch (error) {
    return {
      state: "blocked",
      reason: `PHASE066_PUBLIC_SNAPSHOT_FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}
