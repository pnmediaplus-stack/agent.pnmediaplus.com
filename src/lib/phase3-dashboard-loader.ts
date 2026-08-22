import "server-only";

import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";
import { createPhase3BlockedData, derivePhase3DashboardData } from "@/lib/phase3-dashboard-derivations";
import type { Phase3DashboardLoadResult } from "@/types/phase3";

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const organizationId = process.env.ORGANIZATION_ID?.trim();

  if (!url || !serviceKey || !organizationId) return null;
  return { url: url.replace(/\/$/, ""), serviceKey, organizationId };
}

async function loadLatestWorkflowContext() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const res = await fetch(
    `${config.url}/rest/v1/workflow_run_context?organization_id=eq.${config.organizationId}&select=workflow_run_id,status,last_error,updated_at&order=updated_at.desc&limit=1`,
    {
      cache: "no-store",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Accept: "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public"
      }
    }
  );

  if (!res.ok) return null;

  const rows = await res.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;

  return {
    workflowRunId: row.workflow_run_id ?? null,
    status: row.status ?? null,
    lastError: row.last_error ?? null,
    updatedAt: row.updated_at ?? null
  };
}

export async function loadPhase3DashboardData(): Promise<Phase3DashboardLoadResult> {
  const phase2 = await loadPhase2DashboardData();
  const latestWorkflowContext = await loadLatestWorkflowContext();

  if (phase2.state !== "ready") {
    return {
      state: "blocked",
      reason: phase2.reason ? `PHASE2_DEPENDENCY_BLOCKED:${phase2.reason}` : "PHASE2_DEPENDENCY_BLOCKED",
      data: { ...createPhase3BlockedData(), latestWorkflowContext }
    };
  }

  return {
    state: "ready",
    reason: "PHASE3_LIVE_READ_READY",
    data: derivePhase3DashboardData(phase2.data, latestWorkflowContext)
  };
}
