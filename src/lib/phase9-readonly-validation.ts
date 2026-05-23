import "server-only";

import type { Phase4DashboardLoadResult } from "@/types/phase4";
import type { Phase8HandoffFlow } from "@/lib/phase8-handoff-flow";

type Phase9ValidationState = "ready" | "blocked";
type Phase9Severity = "info" | "warning" | "critical";

type Phase9ValidationCheck = {
  check_id: string;
  state: Phase9ValidationState;
  severity: Phase9Severity;
  message: string;
  source: string;
};

type Phase9DriftFinding = {
  finding_id: string;
  severity: Phase9Severity;
  message: string;
  source: string;
};

type Phase9EscalationNotice = {
  notice_id: string;
  severity: Phase9Severity;
  message: string;
  escalation_required_when: string;
  owner_hint: string;
};

export type Phase9ReadonlyValidationReport = {
  state: Phase9ValidationState;
  reason: string;
  report_name: "Phase 9 Read-Only Validation Automation";
  read_only: true;
  mutation_allowed: false;
  source_of_truth: "public.department_governance_snapshot + public.phase4_* read models";
  validation_scope: string[];
  checks: Phase9ValidationCheck[];
  drift_findings: Phase9DriftFinding[];
  escalation_notices: Phase9EscalationNotice[];
};

function createCheck(
  checkId: string,
  state: Phase9ValidationState,
  severity: Phase9Severity,
  message: string,
  source: string
): Phase9ValidationCheck {
  return {
    check_id: checkId,
    state,
    severity,
    message,
    source
  };
}

function createFinding(findingId: string, severity: Phase9Severity, message: string, source: string): Phase9DriftFinding {
  return {
    finding_id: findingId,
    severity,
    message,
    source
  };
}

function createEscalationNotice(
  noticeId: string,
  severity: Phase9Severity,
  message: string,
  escalationRequiredWhen: string,
  ownerHint: string
): Phase9EscalationNotice {
  return {
    notice_id: noticeId,
    severity,
    message,
    escalation_required_when: escalationRequiredWhen,
    owner_hint: ownerHint
  };
}

function hasOperationsRuntimeBridge(phase8Flow: Phase8HandoffFlow) {
  return phase8Flow.edges.some((edge) => edge.from_department === "Operations" || edge.to_department === "Operations");
}

function hasRuntimeDrift(runtime: Phase4DashboardLoadResult) {
  return runtime.data.traces.some(
    (trace) =>
      trace.currentState === "failed" ||
      trace.currentState === "blocked" ||
      trace.retryState === "blocked" ||
      trace.retryState === "retry_exhausted"
  );
}

function hasReceiptDrift(runtime: Phase4DashboardLoadResult) {
  const receiptsByTraceId = new Set(runtime.data.receipts.map((receipt) => receipt.traceId).filter(Boolean));

  return runtime.data.traces.some((trace) => {
    if (!trace.receiptRef || trace.receiptRef === "pending / incomplete") return false;
    return !receiptsByTraceId.has(trace.id);
  });
}

export function createPhase9ReadonlyValidationReport(
  phase8Flow: Phase8HandoffFlow,
  runtime: Phase4DashboardLoadResult
): Phase9ReadonlyValidationReport {
  const checks: Phase9ValidationCheck[] = [
    createCheck(
      "phase9.governanceSnapshot.loaded",
      "ready",
      "info",
      "Department governance snapshot loaded from public read surface.",
      "public.department_governance_snapshot"
    ),
    createCheck(
      "phase9.handoffGraph.phase8",
      phase8Flow.state,
      phase8Flow.state === "ready" ? "info" : "critical",
      phase8Flow.reason,
      "data.phase8_handoff_flow"
    ),
    createCheck(
      "phase9.runtimeReadModel.phase4",
      runtime.state,
      runtime.state === "ready" ? "info" : "critical",
      runtime.state === "ready" ? "Runtime read model loaded from public Phase 4 views." : runtime.reason,
      "public.phase4_*"
    ),
    createCheck(
      "phase9.runtimeBridge.operations",
      hasOperationsRuntimeBridge(phase8Flow) ? "ready" : "blocked",
      hasOperationsRuntimeBridge(phase8Flow) ? "info" : "critical",
      hasOperationsRuntimeBridge(phase8Flow)
        ? "Operations is connected in the handoff graph."
        : "Operations is not connected in the handoff graph.",
      "data.phase8_handoff_flow.edges"
    ),
    createCheck(
      "phase9.authority.noMutation",
      "ready",
      "info",
      "Validation report is read-only and does not apply changes.",
      "app/flow validation layer"
    )
  ];

  const driftFindings: Phase9DriftFinding[] = [];
  const escalationNotices: Phase9EscalationNotice[] = [];

  if (phase8Flow.state === "blocked") {
    driftFindings.push(
      createFinding(
        "phase9.drift.handoffGraph",
        "critical",
        phase8Flow.reason,
        "public.department_governance_snapshot().handoffs"
      )
    );
    escalationNotices.push(
      createEscalationNotice(
        "phase9.escalation.handoffGraph",
        "critical",
        "Canonical handoff graph is incomplete for Phase 9 validation.",
        "A required Phase 8 handoff link is missing or unresolved.",
        "Human / Governance Relay"
      )
    );
  }

  if (runtime.state === "blocked") {
    driftFindings.push(createFinding("phase9.drift.runtimeReadModel", "critical", runtime.reason, "public.phase4_*"));
    escalationNotices.push(
      createEscalationNotice(
        "phase9.escalation.runtimeReadModel",
        "critical",
        "Runtime validation cannot continue because the Phase 4 read model is blocked.",
        "Phase 4 read models fail closed or return incomplete runtime data.",
        "Operations / Runtime Read Model Owner"
      )
    );
  }

  if (runtime.state === "ready" && hasRuntimeDrift(runtime)) {
    driftFindings.push(
      createFinding(
        "phase9.drift.runtimeExecutionState",
        "warning",
        "Runtime traces include failed, blocked, or retry-exhausted states.",
        "public.phase4_execution_traces + public.phase4_retry_status"
      )
    );
    escalationNotices.push(
      createEscalationNotice(
        "phase9.escalation.runtimeExecutionState",
        "warning",
        "Runtime traces need human-visible review.",
        "Any trace is failed, blocked, or retry exhausted.",
        "Operations / Governance Relay"
      )
    );
  }

  if (runtime.state === "ready" && hasReceiptDrift(runtime)) {
    driftFindings.push(
      createFinding(
        "phase9.drift.receiptAlignment",
        "warning",
        "At least one execution trace references a receipt not present in the read model.",
        "public.phase4_execution_traces + public.phase4_execution_receipts"
      )
    );
    escalationNotices.push(
      createEscalationNotice(
        "phase9.escalation.receiptAlignment",
        "warning",
        "Receipt alignment should be reviewed.",
        "A trace references a receipt that is missing from the read-only receipts view.",
        "Operations / Audit Owner"
      )
    );
  }

  const state = checks.some((check) => check.state === "blocked") ? "blocked" : "ready";

  return {
    state,
    reason: state === "ready" ? "PHASE9_READONLY_VALIDATION_READY" : "PHASE9_READONLY_VALIDATION_BLOCKED",
    report_name: "Phase 9 Read-Only Validation Automation",
    read_only: true,
    mutation_allowed: false,
    source_of_truth: "public.department_governance_snapshot + public.phase4_* read models",
    validation_scope: [
      "cross_department_handoff_graph",
      "operations_runtime_bridge",
      "phase4_runtime_read_model",
      "trace_receipt_alignment",
      "escalation_notice_generation"
    ],
    checks,
    drift_findings: driftFindings,
    escalation_notices: escalationNotices
  };
}
