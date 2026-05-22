import "server-only";

import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";
import { createPhase3BlockedData, derivePhase3DashboardData } from "@/lib/phase3-dashboard-derivations";
import type { Phase3DashboardLoadResult } from "@/types/phase3";

export async function loadPhase3DashboardData(): Promise<Phase3DashboardLoadResult> {
  const phase2 = await loadPhase2DashboardData();

  if (phase2.state !== "ready") {
    return {
      state: "blocked",
      reason: phase2.reason ? `PHASE2_DEPENDENCY_BLOCKED:${phase2.reason}` : "PHASE2_DEPENDENCY_BLOCKED",
      data: createPhase3BlockedData()
    };
  }

  return {
    state: "ready",
    reason: "PHASE3_LIVE_READ_READY",
    data: derivePhase3DashboardData(phase2.data)
  };
}
