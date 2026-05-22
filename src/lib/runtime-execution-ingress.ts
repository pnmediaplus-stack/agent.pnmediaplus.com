import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { validateRuntimeExecutionEvent } from "@/lib/runtime-execution-contract";
import type { RuntimeExecutionEvent } from "@/types/runtime";

const RUNTIME_RPC_SCHEMA = "public";

type RuntimeSupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  rpcName: string;
};

export class RuntimeExecutionIngressError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "RuntimeExecutionIngressError";
    this.status = status;
    this.code = code;
  }
}

export type RuntimeExecutionIngressResult = {
  eventId: string;
  idempotencyKey: string;
  traceId: string;
  workflowRunId: string;
  writeSurface: string;
};

function readSecret() {
  return process.env.RUNTIME_INGRESS_SECRET?.trim() || "";
}

function maxSkewMs() {
  const configured = Number(process.env.RUNTIME_INGRESS_MAX_SKEW_SECONDS || "300");
  const seconds = Number.isFinite(configured) && configured > 0 ? configured : 300;
  return seconds * 1000;
}

function getRuntimeSupabaseConfig(): RuntimeSupabaseConfig {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const rpcName = process.env.RUNTIME_EXECUTION_EVENT_RPC?.trim() || "";

  if (!url || !serviceRoleKey || !rpcName) {
    throw new RuntimeExecutionIngressError(
      503,
      "RUNTIME_APPEND_ONLY_WRITE_SURFACE_MISSING",
      "Runtime ingress validated the event, but no approved append-only Supabase write surface is configured."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    rpcName
  };
}

function parseTimestampHeader(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertTimestampFresh(headers: Headers) {
  const timestamp = parseTimestampHeader(headers.get("x-runtime-event-timestamp"));
  if (timestamp === null) {
    throw new RuntimeExecutionIngressError(
      401,
      "RUNTIME_INGRESS_TIMESTAMP_MISSING",
      "x-runtime-event-timestamp is required."
    );
  }

  const skew = Math.abs(Date.now() - timestamp);
  if (skew > maxSkewMs()) {
    throw new RuntimeExecutionIngressError(
      401,
      "RUNTIME_INGRESS_TIMESTAMP_STALE",
      "Runtime event timestamp is outside the accepted skew window."
    );
  }

  return String(headers.get("x-runtime-event-timestamp") ?? "").trim();
}

function normalizeSignature(value: string | null) {
  const raw = String(value ?? "").trim();
  return raw.startsWith("sha256=") ? raw.slice("sha256=".length) : raw;
}

function verifySignature(rawBody: string, timestampHeader: string, headers: Headers) {
  const secret = readSecret();
  if (!secret) {
    throw new RuntimeExecutionIngressError(
      503,
      "RUNTIME_INGRESS_SECRET_MISSING",
      "Runtime ingress is fail-closed because RUNTIME_INGRESS_SECRET is missing."
    );
  }

  const provided = normalizeSignature(headers.get("x-runtime-event-signature"));
  if (!provided) {
    throw new RuntimeExecutionIngressError(
      401,
      "RUNTIME_INGRESS_SIGNATURE_MISSING",
      "x-runtime-event-signature is required."
    );
  }

  const signedPayload = `${timestampHeader}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (providedBuffer.byteLength !== expectedBuffer.byteLength || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new RuntimeExecutionIngressError(
      401,
      "RUNTIME_INGRESS_SIGNATURE_INVALID",
      "Runtime event signature is invalid."
    );
  }
}

async function callRuntimeAppendOnlyRpc(event: RuntimeExecutionEvent): Promise<RuntimeExecutionIngressResult> {
  const config = getRuntimeSupabaseConfig();
  let response: Response;

  try {
    response = await fetch(`${config.url}/rest/v1/rpc/${config.rpcName}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Profile": RUNTIME_RPC_SCHEMA,
        "Content-Profile": RUNTIME_RPC_SCHEMA
      },
      body: JSON.stringify({
        p_event: event
      })
    });
  } catch (error) {
    throw new RuntimeExecutionIngressError(
      502,
      "RUNTIME_APPEND_ONLY_RPC_NETWORK_FAILED",
      `Runtime append-only RPC network call failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const duplicate = response.status === 409 || body.includes("23505") || body.toLowerCase().includes("duplicate");
    throw new RuntimeExecutionIngressError(
      duplicate ? 409 : response.status >= 400 && response.status < 500 ? 403 : 502,
      duplicate ? "RUNTIME_EVENT_DUPLICATE_IDEMPOTENCY_KEY" : "RUNTIME_APPEND_ONLY_RPC_FAILED",
      `Runtime append-only RPC failed (${response.status}): ${body || response.statusText}`
    );
  }

  return {
    eventId: event.event_id,
    idempotencyKey: event.idempotency_key,
    traceId: event.trace_id,
    workflowRunId: event.workflow_run_id,
    writeSurface: config.rpcName
  };
}

export async function ingestRuntimeExecutionEvent(rawBody: string, headers: Headers) {
  const timestampHeader = assertTimestampFresh(headers);
  verifySignature(rawBody, timestampHeader, headers);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new RuntimeExecutionIngressError(
      400,
      "RUNTIME_EVENT_INVALID_JSON",
      "Runtime event body must be valid JSON."
    );
  }

  const validation = validateRuntimeExecutionEvent(parsed);
  if (!validation.ok) {
    throw new RuntimeExecutionIngressError(validation.status, validation.code, validation.message);
  }

  const emittedAt = Date.parse(validation.event.emitted_at);
  if (Math.abs(Date.now() - emittedAt) > maxSkewMs()) {
    throw new RuntimeExecutionIngressError(
      401,
      "RUNTIME_EVENT_EMITTED_AT_STALE",
      "Runtime event emitted_at is outside the accepted skew window."
    );
  }

  return callRuntimeAppendOnlyRpc(validation.event);
}
