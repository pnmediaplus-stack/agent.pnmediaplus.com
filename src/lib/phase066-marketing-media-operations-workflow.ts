import "server-only";

import phase066Contracts from "../../n8n/webhook-contracts/066_MARKETING_MEDIA_OPERATIONS_WORKFLOW_CONTRACTS.json";
import type { Phase065MarketingAutomation } from "@/lib/phase065-marketing-automation";
import type { Phase8HandoffFlow, Phase8HandoffFlowEdge } from "@/lib/phase8-handoff-flow";
import type { Phase066SnapshotLoadResult, Phase066ClaimBoundaryEvidence } from "@/lib/phase066-snapshot-loader";
import type { Phase2DashboardLoadResult, Phase2PipelineState } from "@/types/phase2";

type Phase066State = "ready" | "blocked";
type Phase066ActivationStatus = "READ_ONLY_READY" | "DRY_RUN_READY" | "BLOCKED_UNTIL_EXPLICIT_REVIEW" | "BLOCKED";

type ContractWorkflowStep = {
  step_id: string;
  order: number;
  source_department: "Marketing" | "Media" | "Operations";
  target_department: "Media" | "Operations";
  owner: "Marketing" | "Media" | "Operations";
  target_owner: "Media" | "Operations";
  current_state: Phase2PipelineState;
  requested_next_state: Phase2PipelineState;
  source_of_truth: string;
  required_evidence: string[];
  blocked_conditions: string[];
  escalation_path: string[];
  activation_status: Phase066ActivationStatus;
};

type ContractDryRunPath = {
  path_id: string;
  order: number;
  mode: "dry_run" | "controlled_observation";
  input_contract: string;
  output_contract: string;
  activation_status: Phase066ActivationStatus;
};

type ContractFile = {
  contract_version: string;
  roadmap_ref: "docs/governance/066_MARKETING_MEDIA_OPERATIONS_WORKFLOW_ROADMAP_v1.md";
  workflow_steps: ContractWorkflowStep[];
  dry_run_paths: ContractDryRunPath[];
  review_required_before_activation: boolean;
};

type Phase066EvidenceValue = {
  key: string;
  state: Phase066State;
  value: string | number | boolean | null;
  source: string;
};

type Phase066HandoffPacket = ContractWorkflowStep & {
  state: Phase066State;
  reason: string;
  source_handoff_id: string | null;
  evidence: Phase066EvidenceValue[];
  missing_evidence: string[];
  mutation_allowed: false;
  authority_granted: false;
};

type Phase066DryRunPath = ContractDryRunPath & {
  state: Phase066State;
  reason: string;
  mutation_allowed: false;
  authority_granted: false;
};

type Phase066StopCondition = {
  condition_id: string;
  triggered: boolean;
  message: string;
};

export type Phase066MarketingMediaOperationsWorkflow = {
  state: Phase066State;
  reason: string;
  contract_version: string;
  roadmap_ref: "docs/governance/066_MARKETING_MEDIA_OPERATIONS_WORKFLOW_ROADMAP_v1.md";
  flow_name: "Marketing-Media-Operations";
  source_of_truth_unchanged: true;
  read_only_first: true;
  mutation_allowed: false;
  authority_granted: false;
  review_required_before_activation: true;
  handoff_packets: Phase066HandoffPacket[];
  dry_run_paths: Phase066DryRunPath[];
  controlled_execution_observation: Phase066DryRunPath | null;
  stop_conditions: Phase066StopCondition[];
  blocker: string | null;
};

function createStopCondition(conditionId: string, triggered: boolean, message: string): Phase066StopCondition {
  return {
    condition_id: conditionId,
    triggered,
    message
  };
}

function createEvidence(key: string, value: string | number | boolean | null, source: string): Phase066EvidenceValue {
  return {
    key,
    state: value === null || value === "" || value === 0 ? "blocked" : "ready",
    value,
    source
  };
}

function findHandoffEdge(flow: Phase8HandoffFlow, sourceDepartment: string, targetDepartment: string): Phase8HandoffFlowEdge | null {
  if (sourceDepartment === targetDepartment) return null;
  return flow.edges.find((edge) => edge.from_department === sourceDepartment && edge.to_department === targetDepartment) ?? null;
}

function getContentItemEvidence(phase2: Phase2DashboardLoadResult, state: Phase2PipelineState) {
  if (phase2.state === "blocked") return null;
  return phase2.data.contentItems.find((item) => item.currentState === state) ?? null;
}

function hasAssetEvidence(phase2: Phase2DashboardLoadResult) {
  if (phase2.state === "blocked") return false;
  return phase2.data.assets.some((asset) => Boolean(asset.evidenceRef));
}

function surfaceKeyForStep(step: ContractWorkflowStep) {
  if (step.source_department === "Marketing" && step.target_department === "Media") return "marketing_to_media";
  if (step.source_department === "Media" && step.target_department === "Operations") return "media_to_operations";
  return null;
}

function findSnapshotClaimBoundary(
  snapshot: Phase066SnapshotLoadResult,
  step: ContractWorkflowStep
): Phase066ClaimBoundaryEvidence | null {
  if (snapshot.state === "blocked") return null;

  const surfaceKey = surfaceKeyForStep(step);
  if (!surfaceKey) return null;

  return snapshot.data.claim_boundary_evidence.find((item) => item.surface_key === surfaceKey) ?? null;
}

function findSnapshotMonitoringTrace(snapshot: Phase066SnapshotLoadResult) {
  if (snapshot.state === "blocked") return null;
  return snapshot.data.monitoring_trace_refs.find((item) => item.monitoring_trace_ref) ?? null;
}

function createPacketEvidence(
  step: ContractWorkflowStep,
  phase8Flow: Phase8HandoffFlow,
  phase2: Phase2DashboardLoadResult,
  phase066Snapshot: Phase066SnapshotLoadResult
): { sourceHandoffId: string | null; evidence: Phase066EvidenceValue[] } {
  const contentItem = getContentItemEvidence(phase2, step.current_state);
  const edge = findHandoffEdge(phase8Flow, step.source_department, step.target_department);
  const snapshotEvidence = findSnapshotClaimBoundary(phase066Snapshot, step);
  const snapshotMonitoringTrace = findSnapshotMonitoringTrace(phase066Snapshot);
  const sourceHandoffId = snapshotEvidence?.source_handoff_id ?? edge?.source_handoff_id ?? null;
  const claimBoundarySource = snapshotEvidence?.source_of_truth ?? "public.department_governance_phase066_snapshot().claim_boundary_evidence";
  const monitoringTraceRef = snapshotEvidence?.monitoring_trace_ref ?? snapshotMonitoringTrace?.monitoring_trace_ref ?? null;

  const evidenceByKey: Record<string, Phase066EvidenceValue> = {
    content_item_id: createEvidence("content_item_id", contentItem?.id ?? null, "public.phase2_content_items"),
    owner_ref: createEvidence("owner_ref", contentItem?.ownerRef ?? null, "public.phase2_content_items"),
    task_owner_ref: createEvidence("task_owner_ref", contentItem?.taskOwnerRef ?? null, "public.phase2_content_items"),
    brief: createEvidence("brief", contentItem?.brief ?? null, "public.phase2_content_items"),
    claim_boundary: createEvidence("claim_boundary", snapshotEvidence?.claim_boundary ?? snapshotEvidence?.claim_boundary_ref ?? null, claimBoundarySource),
    source_handoff_id: createEvidence("source_handoff_id", sourceHandoffId, "public.department_governance_phase066_snapshot().claim_boundary_evidence"),
    asset_evidence_ref: createEvidence("asset_evidence_ref", hasAssetEvidence(phase2), "public.phase2_assets"),
    qa_boundary: createEvidence("qa_boundary", snapshotEvidence?.qa_boundary_evidence_ref ?? null, claimBoundarySource),
    routing_status: createEvidence("routing_status", phase2.state === "ready", "public.phase2_agent_tasks"),
    monitoring_trace_ref: createEvidence(
      "monitoring_trace_ref",
      monitoringTraceRef,
      "public.department_governance_phase066_snapshot().monitoring_trace_refs"
    )
  };

  return {
    sourceHandoffId,
    evidence: step.required_evidence.map((key) => evidenceByKey[key] ?? createEvidence(key, null, "BLOCKED:unknown evidence key"))
  };
}

function createHandoffPacket(
  step: ContractWorkflowStep,
  phase8Flow: Phase8HandoffFlow,
  phase2: Phase2DashboardLoadResult,
  phase066Snapshot: Phase066SnapshotLoadResult
): Phase066HandoffPacket {
  const { sourceHandoffId, evidence } = createPacketEvidence(step, phase8Flow, phase2, phase066Snapshot);
  const missingEvidence = evidence.filter((item) => item.state === "blocked").map((item) => item.key);
  const state = missingEvidence.length > 0 ? "blocked" : "ready";

  return {
    ...step,
    state,
    reason: state === "ready" ? "PHASE066_HANDOFF_PACKET_READY" : `PHASE066_HANDOFF_PACKET_BLOCKED:${missingEvidence.join(",")}`,
    source_handoff_id: sourceHandoffId,
    evidence,
    missing_evidence: missingEvidence,
    mutation_allowed: false,
    authority_granted: false
  };
}

function createDryRunPath(path: ContractDryRunPath, packets: Phase066HandoffPacket[], phase065: Phase065MarketingAutomation): Phase066DryRunPath {
  const packetsReady = packets.every((packet) => packet.state === "ready");
  const phase065Ready = phase065.state === "ready";
  const controlledBlocked = path.activation_status === "BLOCKED_UNTIL_EXPLICIT_REVIEW";
  const state = packetsReady && phase065Ready ? "ready" : "blocked";

  return {
    ...path,
    state,
    reason:
      state === "ready"
        ? controlledBlocked
          ? "PHASE066_CONTROLLED_OBSERVATION_READY:BUT_ACTIVATION_REQUIRES_EXPLICIT_REVIEW"
          : "PHASE066_DRY_RUN_PATH_READY"
        : `PHASE066_DRY_RUN_PATH_BLOCKED:${!phase065Ready ? phase065.reason : "HANDOFF_PACKET_INCOMPLETE"}`,
    mutation_allowed: false,
    authority_granted: false
  };
}

export function createPhase066MarketingMediaOperationsWorkflow(input: {
  phase8Flow: Phase8HandoffFlow;
  phase065: Phase065MarketingAutomation;
  phase2: Phase2DashboardLoadResult;
  phase066Snapshot: Phase066SnapshotLoadResult;
}): Phase066MarketingMediaOperationsWorkflow {
  const contractFile = phase066Contracts as ContractFile;
  const handoffPackets = contractFile.workflow_steps.map((step) =>
    createHandoffPacket(step, input.phase8Flow, input.phase2, input.phase066Snapshot)
  );
  const dryRunPaths = contractFile.dry_run_paths.map((path) => createDryRunPath(path, handoffPackets, input.phase065));
  const controlledExecutionObservation = dryRunPaths.find((path) => path.path_id === "066.path.controlled_execution_observation") ?? null;
  const stopConditions = [
    createStopCondition(
      "phase066.stop.phase8_blocked",
      input.phase8Flow.state === "blocked",
      input.phase8Flow.reason
    ),
    createStopCondition(
      "phase066.stop.phase065_blocked",
      input.phase065.state === "blocked",
      input.phase065.blocker ?? input.phase065.reason
    ),
    createStopCondition(
      "phase066.stop.snapshot_blocked",
      input.phase066Snapshot.state === "blocked",
      input.phase066Snapshot.reason
    ),
    createStopCondition(
      "phase066.stop.packet_missing_evidence",
      handoffPackets.some((packet) => packet.state === "blocked"),
      "A handoff packet is missing owner, target owner, state, evidence, blocked conditions, or escalation path."
    ),
    createStopCondition(
      "phase066.stop.live_review_required",
      controlledExecutionObservation?.activation_status === "BLOCKED_UNTIL_EXPLICIT_REVIEW",
      "Controlled workflow observation requires explicit review before activation."
    )
  ];
  const hardBlocker = stopConditions.find(
    (condition) => condition.triggered && condition.condition_id !== "phase066.stop.live_review_required"
  );
  const pathsReady = dryRunPaths.every((path) => path.state === "ready");

  return {
    state: hardBlocker || !pathsReady ? "blocked" : "ready",
    reason: hardBlocker || !pathsReady ? "PHASE066_MARKETING_MEDIA_OPERATIONS_WORKFLOW_BLOCKED" : "PHASE066_MARKETING_MEDIA_OPERATIONS_WORKFLOW_READY",
    contract_version: contractFile.contract_version,
    roadmap_ref: contractFile.roadmap_ref,
    flow_name: "Marketing-Media-Operations",
    source_of_truth_unchanged: true,
    read_only_first: true,
    mutation_allowed: false,
    authority_granted: false,
    review_required_before_activation: true,
    handoff_packets: handoffPackets,
    dry_run_paths: dryRunPaths,
    controlled_execution_observation: controlledExecutionObservation,
    stop_conditions: stopConditions,
    blocker: hardBlocker?.message ?? null
  };
}
