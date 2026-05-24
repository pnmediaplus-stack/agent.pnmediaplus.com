import "server-only";

const PUBLIC_SCHEMA = "public";

type JsonObject = Record<string, unknown>;

export type Phase067Lead = {
  lead_id: string | null;
  source_channel: string | null;
  source_ref: string | null;
  customer_ref: string | null;
  owner_ref: string | null;
  stage: string | null;
  claim_boundary: string | null;
  qa_boundary: string | null;
  status: string | null;
  evidence_refs: string[];
  escalation_path: string[];
  history_count: number | null;
  latest_event_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Phase067LeadHistory = {
  lead_id: string | null;
  source_channel: string | null;
  source_ref: string | null;
  customer_ref: string | null;
  owner_ref: string | null;
  event_type: string | null;
  actor_type: string | null;
  actor_ref: string | null;
  stage: string | null;
  claim_boundary: string | null;
  qa_boundary: string | null;
  status: string | null;
  evidence_refs: string[];
  escalation_path: string[];
  before_state: JsonObject | null;
  after_state: JsonObject | null;
  request_id: string | null;
  event_hash: string | null;
  created_at: string | null;
};

export type Phase067LeadSummary = {
  lead_count: number | null;
  blocked_count: number | null;
  escalated_count: number | null;
};

export type Phase067LeadSnapshot = {
  leads: Phase067Lead[];
  lead_history: Phase067LeadHistory[];
  summary: Phase067LeadSummary;
};

export type Phase067LeadLoadResult =
  | {
      state: "ready";
      reason: "PHASE067_LEAD_SNAPSHOT_LOADED";
      data: Phase067LeadSnapshot;
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

function numberField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function normalizeArray<T>(value: unknown, normalizer: (item: JsonObject) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isJsonObject).map(normalizer);
}

function normalizeLead(value: JsonObject): Phase067Lead {
  return {
    lead_id: stringField(value.lead_id),
    source_channel: stringField(value.source_channel),
    source_ref: stringField(value.source_ref),
    customer_ref: stringField(value.customer_ref),
    owner_ref: stringField(value.owner_ref),
    stage: stringField(value.stage),
    claim_boundary: stringField(value.claim_boundary),
    qa_boundary: stringField(value.qa_boundary),
    status: stringField(value.status),
    evidence_refs: stringArray(value.evidence_refs),
    escalation_path: stringArray(value.escalation_path),
    history_count: numberField(value.history_count),
    latest_event_at: stringField(value.latest_event_at),
    created_at: stringField(value.created_at),
    updated_at: stringField(value.updated_at)
  };
}

function normalizeLeadHistory(value: JsonObject): Phase067LeadHistory {
  return {
    lead_id: stringField(value.lead_id),
    source_channel: stringField(value.source_channel),
    source_ref: stringField(value.source_ref),
    customer_ref: stringField(value.customer_ref),
    owner_ref: stringField(value.owner_ref),
    event_type: stringField(value.event_type),
    actor_type: stringField(value.actor_type),
    actor_ref: stringField(value.actor_ref),
    stage: stringField(value.stage),
    claim_boundary: stringField(value.claim_boundary),
    qa_boundary: stringField(value.qa_boundary),
    status: stringField(value.status),
    evidence_refs: stringArray(value.evidence_refs),
    escalation_path: stringArray(value.escalation_path),
    before_state: isJsonObject(value.before_state) ? value.before_state : null,
    after_state: isJsonObject(value.after_state) ? value.after_state : null,
    request_id: stringField(value.request_id),
    event_hash: stringField(value.event_hash),
    created_at: stringField(value.created_at)
  };
}

function normalizeSummary(value: unknown): Phase067LeadSummary {
  if (!isJsonObject(value)) {
    return {
      lead_count: null,
      blocked_count: null,
      escalated_count: null
    };
  }

  return {
    lead_count: numberField(value.lead_count),
    blocked_count: numberField(value.blocked_count),
    escalated_count: numberField(value.escalated_count)
  };
}

function normalizeSnapshot(value: unknown): Phase067LeadSnapshot | null {
  if (!isJsonObject(value)) return null;

  return {
    leads: normalizeArray(value.leads, normalizeLead),
    lead_history: normalizeArray(value.lead_history, normalizeLeadHistory),
    summary: normalizeSummary(value.summary)
  };
}

export async function loadPhase067LeadSnapshot(): Promise<Phase067LeadLoadResult> {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      state: "blocked",
      reason: "PHASE067_LEAD_SNAPSHOT_ENV_MISSING",
      data: null
    };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/phase067_lead_snapshot`);
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
        reason: `PHASE067_LEAD_SNAPSHOT_RPC_FAILED:${response.status}:${body || response.statusText}`,
        data: null
      };
    }

    const snapshot = normalizeSnapshot(await response.json());

    if (!snapshot) {
      return {
        state: "blocked",
        reason: "PHASE067_LEAD_SNAPSHOT_INVALID_SHAPE",
        data: null
      };
    }

    return {
      state: "ready",
      reason: "PHASE067_LEAD_SNAPSHOT_LOADED",
      data: snapshot
    };
  } catch (error) {
    return {
      state: "blocked",
      reason: `PHASE067_LEAD_SNAPSHOT_FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}
