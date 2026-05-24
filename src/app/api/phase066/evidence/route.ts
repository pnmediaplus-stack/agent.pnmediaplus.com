import { readControlPlaneSessionCookie, verifyControlPlaneSessionCookieValue } from "@/lib/control-plane-session";

const PHASE066_EVIDENCE_WRITE_RPC = "phase066_evidence_write_rpc";

type EvidencePayload = {
  content_item_id?: unknown;
  claim_boundary?: unknown;
  qa_boundary?: unknown;
  task_owner_ref?: unknown;
};

type NormalizedEvidencePayload = {
  content_item_id: string;
  claim_boundary: string;
  qa_boundary: string;
  task_owner_ref: string;
  actor_type: "HUMAN";
  actor_ref: string;
  source: "phase066-evidence-ui";
};

function envelope(
  status: number,
  body: {
    ok: boolean;
    state: "ready" | "blocked";
    message: string;
    data?: unknown;
    error?: string;
  }
) {
  return Response.json(
    {
      route: "phase066-evidence",
      status,
      ...body,
      receivedAt: new Date().toISOString()
    },
    { status }
  );
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePayload(payload: EvidencePayload, actorRef: string): NormalizedEvidencePayload | { error: string } {
  const contentItemId = stringField(payload.content_item_id);
  const claimBoundary = stringField(payload.claim_boundary);
  const qaBoundary = stringField(payload.qa_boundary);
  const taskOwnerRef = stringField(payload.task_owner_ref);
  const missing = [
    ["content_item_id", contentItemId],
    ["claim_boundary", claimBoundary],
    ["qa_boundary", qaBoundary],
    ["task_owner_ref", taskOwnerRef]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { error: `PHASE066_EVIDENCE_FIELDS_MISSING:${missing.join(",")}` };
  }

  if (!contentItemId || !claimBoundary || !qaBoundary || !taskOwnerRef) {
    return { error: "PHASE066_EVIDENCE_FIELDS_MISSING" };
  }

  return {
    content_item_id: contentItemId,
    claim_boundary: claimBoundary,
    qa_boundary: qaBoundary,
    task_owner_ref: taskOwnerRef,
    actor_type: "HUMAN",
    actor_ref: actorRef,
    source: "phase066-evidence-ui"
  };
}

async function postEvidenceToApprovedRpc(payload: NormalizedEvidencePayload) {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceRoleKey) {
    return {
      state: "blocked" as const,
      reason: "PHASE066_EVIDENCE_SERVICE_ROLE_ENV_MISSING"
    };
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${PHASE066_EVIDENCE_WRITE_RPC}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": "public",
      "Content-Profile": "public"
    },
    body: JSON.stringify({
      payload
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      state: "blocked" as const,
      reason: `PHASE066_EVIDENCE_RPC_FAILED:${response.status}:${body || response.statusText}`
    };
  }

  const data = await response.json().catch(() => null);
  return {
    state: "ready" as const,
    data
  };
}

export async function POST(request: Request) {
  const session = await verifyControlPlaneSessionCookieValue(readControlPlaneSessionCookie(request.headers));

  if (!session) {
    return envelope(401, {
      ok: false,
      state: "blocked",
      message: "Human control-plane session is required.",
      error: "PHASE066_EVIDENCE_UNAUTHORIZED"
    });
  }

  const body = (await request.json().catch(() => ({}))) as EvidencePayload;
  const normalized = normalizePayload(body, session.actorRef);

  if ("error" in normalized) {
    return envelope(400, {
      ok: false,
      state: "blocked",
      message: "Phase 066 evidence packet is incomplete.",
      error: normalized.error
    });
  }

  try {
    const result = await postEvidenceToApprovedRpc(normalized);

    if (result.state === "blocked") {
      return envelope(503, {
        ok: false,
        state: "blocked",
        message: "Phase 066 evidence write surface is not approved or not configured.",
        error: result.reason,
        data: {
          accepted_by_control_plane: true,
          mutation_performed: false,
          rpc: `public.${PHASE066_EVIDENCE_WRITE_RPC}(payload jsonb)`,
          required_owner: "DATABASE_BOT"
        }
      });
    }

    return envelope(200, {
      ok: true,
      state: "ready",
      message: "Phase 066 evidence packet accepted by the approved write surface.",
      data: {
        accepted_by_control_plane: true,
        mutation_performed: true,
        rpc: `public.${PHASE066_EVIDENCE_WRITE_RPC}(payload jsonb)`,
        result: result.data
      }
    });
  } catch (error) {
    return envelope(502, {
      ok: false,
      state: "blocked",
      message: "Phase 066 evidence write surface failed downstream.",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
