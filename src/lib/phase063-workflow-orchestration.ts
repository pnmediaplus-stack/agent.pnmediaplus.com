import "server-only";

import type { Phase4DashboardLoadResult } from "@/types/phase4";
import type { Phase8HandoffFlow } from "@/lib/phase8-handoff-flow";
import type { Phase9ReadonlyValidationReport } from "@/lib/phase9-readonly-validation";

type Phase063StageState = "ready" | "blocked";
type Phase063Severity = "info" | "warning" | "critical";

type Phase063OrchestrationStage = {
  stage_id: string;
  order: number;
  state: Phase063StageState;
  mode: "read_only_validation" | "dry_run_orchestration" | "controlled_live_observation" | "drift_monitoring_escalation";
  reason: string;
  source: string;
  mutation_allowed: false;
  authority_granted: false;
};

type Phase063DryRunEdge = {
  from_department: string;
  to_department: string;
  state: Phase063StageState;
  reason: string;
  source_handoff_id: string | null;
};

type Phase063LiveWorkflowObservation = {
  workflow_ref: string;
  total_traces: number;
  blocked_or_failed_traces: number;
  retry_exhausted_traces: number;
  state: Phase063StageState;
};

type Phase063StopCondition = {
  condition_id: string;
  severity: Phase063Severity;
  triggered: boolean;
  message: string;
};

type Phase063EscalationNotice = {
  notice_id: string;
  severity: Phase063Severity;
  message: string;
  owner_hint: string;
};

export type Phase063WorkflowOrchestration = {
  state: Phase063StageState;
  reason: string;
  roadmap_ref: "docs/governance/063_WORKFLOW_ORCHESTRATION_ROADMAP_v1.md";
  orchestration_name: "Phase 063 Workflow Orchestration";
  default_flow: string[];
  read_only: true;
  mutation_allowed: false;
  source_of_truth_unchanged: true;
  authority_granted: false;
  stages: Phase063OrchestrationStage[];
  dry_run_edges: Phase063DryRunEdge[];
  controlled_live_workflows: Phase063LiveWorkflowObservation[];
  stop_conditions: Phase063StopCondition[];
  escalation_notices: Phase063EscalationNotice[];
  blocker: string | null;
};

const DEFAULT_FLOW = ["Marketing", "Media", "Operations", "Customer", "Business Truth"] as const;

const REQUIRED_DRY_RUN_EDGES = [
  ["Marketing", "Media"],
  ["Media", "Operations"],
  ["Operations", "Customer"],
  ["Customer", "Business Truth"]
] as const;

function normalizePair(left: string, right: string) {
  return [left, right].sort((a, b) => a.localeCompare(b)).join("::");
}

function createStage(
  stageId: string,
  order: number,
  state: Phase063StageState,
  mode: Phase063OrchestrationStage["mode"],
  reason: string,
  source: string
): Phase063OrchestrationStage {
  return {
    stage_id: stageId,
    order,
    state,
    mode,
    reason,
    source,
    mutation_allowed: false,
    authority_granted: false
  };
}

function createStopCondition(conditionId: string, severity: Phase063Severity, triggered: boolean, message: string): Phase063StopCondition {
  return {
    condition_id: conditionId,
    severity,
    triggered,
    message
  };
}

function createEscalationNotice(noticeId: string, severity: Phase063Severity, message: string, ownerHint: string): Phase063EscalationNotice {
  return {
    notice_id: noticeId,
    severity,
    message,
    owner_hint: ownerHint
  };
}

function createDryRunEdges(phase8Flow: Phase8HandoffFlow): Phase063DryRunEdge[] {
  const edgeByPair = new Map(phase8Flow.edges.map((edge) => [normalizePair(edge.from_department, edge.to_department), edge]));

  return REQUIRED_DRY_RUN_EDGES.map(([fromDepartment, toDepartment]) => {
    const edge = edgeByPair.get(normalizePair(fromDepartment, toDepartment));

    return {
      from_department: fromDepartment,
      to_department: toDepartment,
      state: edge ? "ready" : "blocked",
      reason: edge ? "PHASE063_DRY_RUN_EDGE_MATCHED_CANONICAL_HANDOFF" : "PHASE063_DRY_RUN_EDGE_MISSING_CANONICAL_HANDOFF",
      source_handoff_id: edge?.source_handoff_id ?? null
    };
  });
}

function createLiveWorkflowObservations(runtime: Phase4DashboardLoadResult): Phase063LiveWorkflowObservation[] {
  const groups = new Map<string, typeof runtime.data.traces>();

  for (const trace of runtime.data.traces) {
    const workflowRef = trace.workflowRef || "pending / incomplete";
    const traces = groups.get(workflowRef) ?? [];
    traces.push(trace);
    groups.set(workflowRef, traces);
  }

  return Array.from(groups.entries()).map(([workflowRef, traces]) => {
    const blockedOrFailed = traces.filter((trace) => trace.currentState === "blocked" || trace.currentState === "failed").length;
    const retryExhausted = traces.filter((trace) => trace.retryState === "retry_exhausted").length;

    return {
      workflow_ref: workflowRef,
      total_traces: traces.length,
      blocked_or_failed_traces: blockedOrFailed,
      retry_exhausted_traces: retryExhausted,
      state: blockedOrFailed > 0 || retryExhausted > 0 ? "blocked" : "ready"
    };
  });
}

function hasRuntimeSelfApprovalSignal(runtime: Phase4DashboardLoadResult) {
  return runtime.data.auditEvents.some((event) => {
    const eventType = event.eventType.toLowerCase();
    const actorRef = event.actorRef.toLowerCase();

    return eventType.includes("approve") && (actorRef.includes("n8n") || actorRef.includes("runtime"));
  });
}

export function createPhase063WorkflowOrchestration(input: {
  phase8Flow: Phase8HandoffFlow;
  phase9Report: Phase9ReadonlyValidationReport;
  runtime: Phase4DashboardLoadResult;
}): Phase063WorkflowOrchestration {
  const dryRunEdges = createDryRunEdges(input.phase8Flow);
  const dryRunReady = dryRunEdges.every((edge) => edge.state === "ready");
  const runtimeReady = input.runtime.state === "ready";
  const liveWorkflowObservations = runtimeReady ? createLiveWorkflowObservations(input.runtime) : [];
  const liveReady = runtimeReady && liveWorkflowObservations.every((workflow) => workflow.state === "ready");
  const driftReady = input.phase9Report.state === "ready" && liveReady;
  const runtimeSelfApprovalSignal = hasRuntimeSelfApprovalSignal(input.runtime);

  const stages = [
    createStage(
      "phase063.read_only_validation",
      1,
      input.phase9Report.state,
      "read_only_validation",
      input.phase9Report.reason,
      "data.phase9_validation_report"
    ),
    createStage(
      "phase063.dry_run_orchestration",
      2,
      dryRunReady ? "ready" : "blocked",
      "dry_run_orchestration",
      dryRunReady ? "PHASE063_DRY_RUN_MATCHES_CANONICAL_HANDOFFS" : "PHASE063_DRY_RUN_BLOCKED_CANONICAL_HANDOFF_MISSING",
      "data.phase8_handoff_flow"
    ),
    createStage(
      "phase063.controlled_live_workflow",
      3,
      liveReady ? "ready" : "blocked",
      "controlled_live_observation",
      liveReady ? "PHASE063_CONTROLLED_LIVE_OBSERVATION_READY" : input.runtime.reason || "PHASE063_CONTROLLED_LIVE_OBSERVATION_BLOCKED",
      "public.phase4_execution_traces + public.phase4_retry_status"
    ),
    createStage(
      "phase063.drift_monitoring_escalation",
      4,
      driftReady && !runtimeSelfApprovalSignal ? "ready" : "blocked",
      "drift_monitoring_escalation",
      driftReady && !runtimeSelfApprovalSignal
        ? "PHASE063_DRIFT_MONITORING_READY"
        : "PHASE063_DRIFT_MONITORING_ESCALATION_REQUIRED",
      "data.phase9_validation_report + public.phase4_execution_audit_events"
    )
  ];

  const stopConditions = [
    createStopCondition(
      "phase063.stop.workflow_mutates_truth",
      "critical",
      false,
      "No mutation path is exposed by this app/API orchestration surface."
    ),
    createStopCondition(
      "phase063.stop.runtime_self_approval",
      "critical",
      runtimeSelfApprovalSignal,
      runtimeSelfApprovalSignal
        ? "Runtime/n8n-like actor appears in an approval audit event."
        : "No runtime self-approval signal detected in read-only audit events."
    ),
    createStopCondition(
      "phase063.stop.handoff_contract_bypass",
      "critical",
      !dryRunReady,
      dryRunReady ? "Dry-run edges match canonical handoff graph." : "Dry-run requires a missing canonical handoff edge."
    ),
    createStopCondition(
      "phase063.stop.live_run_missing_read_model",
      "critical",
      !runtimeReady,
      runtimeReady ? "Runtime read model is available." : input.runtime.reason
    )
  ];

  const escalationNotices: Phase063EscalationNotice[] = [
    ...dryRunEdges
      .filter((edge) => edge.state === "blocked")
      .map((edge) =>
        createEscalationNotice(
          `phase063.escalation.dry_run.${edge.from_department}.${edge.to_department}`,
          "critical",
          `Dry-run blocked: ${edge.from_department} -> ${edge.to_department} is not backed by canonical handoff data.`,
          "Human / Governance Relay"
        )
      ),
    ...liveWorkflowObservations
      .filter((workflow) => workflow.state === "blocked")
      .map((workflow) =>
        createEscalationNotice(
          `phase063.escalation.live.${workflow.workflow_ref}`,
          "warning",
          `Controlled live observation found blocked/failed or retry-exhausted traces for ${workflow.workflow_ref}.`,
          "Operations / Runtime Read Model Owner"
        )
      )
  ];

  if (runtimeSelfApprovalSignal) {
    escalationNotices.push(
      createEscalationNotice(
        "phase063.escalation.runtime_self_approval",
        "critical",
        "Runtime self-approval signal detected. Stop and review.",
        "Human / Governance Relay"
      )
    );
  }

  const state = stages.some((stage) => stage.state === "blocked") || stopConditions.some((condition) => condition.triggered)
    ? "blocked"
    : "ready";
  const blocker = state === "blocked"
    ? stages.find((stage) => stage.state === "blocked")?.reason ?? stopConditions.find((condition) => condition.triggered)?.message ?? "PHASE063_BLOCKED"
    : null;

  return {
    state,
    reason: state === "ready" ? "PHASE063_WORKFLOW_ORCHESTRATION_READY" : "PHASE063_WORKFLOW_ORCHESTRATION_BLOCKED",
    roadmap_ref: "docs/governance/063_WORKFLOW_ORCHESTRATION_ROADMAP_v1.md",
    orchestration_name: "Phase 063 Workflow Orchestration",
    default_flow: [...DEFAULT_FLOW],
    read_only: true,
    mutation_allowed: false,
    source_of_truth_unchanged: true,
    authority_granted: false,
    stages,
    dry_run_edges: dryRunEdges,
    controlled_live_workflows: liveWorkflowObservations,
    stop_conditions: stopConditions,
    escalation_notices: escalationNotices,
    blocker
  };
}
