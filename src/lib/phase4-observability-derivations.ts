import type { Phase4DashboardData } from "@/types/phase4";

export function countPhase4TraceFailures(data: Phase4DashboardData) {
  return data.traces.filter((trace) => trace.currentState === "failed" || trace.currentState === "blocked").length;
}

export function countPhase4RunningTraces(data: Phase4DashboardData) {
  return data.traces.filter((trace) => trace.currentState === "queued" || trace.currentState === "running").length;
}

export function calculatePhase4SuccessRate(data: Phase4DashboardData) {
  return data.metricsSnapshot?.successRatePct ?? null;
}
