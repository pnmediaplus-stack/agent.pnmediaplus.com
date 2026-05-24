import "server-only";

import phase065Contracts from "../../n8n/webhook-contracts/065_MARKETING_AUTOMATION_CONTRACTS.json";
import type { Phase064N8nWorkflowContracts } from "@/lib/phase064-n8n-workflow-contracts";
import type { Phase10OperationalExpansion } from "@/lib/phase10-operational-expansion";
import type { Phase2DashboardLoadResult, Phase2PipelineState } from "@/types/phase2";

type Phase065State = "ready" | "blocked";
type Phase065ActivationStatus =
  | "READ_ONLY_READY"
  | "DRY_RUN_ONLY"
  | "DRY_RUN_READY"
  | "BLOCKED_UNTIL_EXPLICIT_REVIEW"
  | "BLOCKED";

type ContractQueueableAction = {
  action_id: string;
  action_kind: string;
  source_state: Phase2PipelineState;
  target_state: Phase2PipelineState;
  owner_boundary: string;
  required_evidence: string[];
  activation_status: Phase065ActivationStatus;
};

type ContractAutoPostContract = {
  contract_id: string;
  scope: string;
  allowed_actions: string[];
  forbidden_actions: string[];
  activation_status: Phase065ActivationStatus;
};

type ContractLeadFunnelMapping = {
  mapping_id: string;
  stage: string;
  source_signal: string;
  allowed_output: string;
  must_not: string;
};

type ContractAutomationPath = {
  path_id: string;
  order: number;
  mode: string;
  input_contract: string;
  output_contract: string;
  activation_status: Phase065ActivationStatus;
};

type ContractFile = {
  contract_version: string;
  roadmap_ref: "docs/governance/065_MARKETING_AUTOMATION_ROADMAP_v1.md";
  queueable_actions: ContractQueueableAction[];
  auto_post_contracts: ContractAutoPostContract[];
  lead_funnel_mappings: ContractLeadFunnelMapping[];
  automation_paths: ContractAutomationPath[];
  review_required_before_activation: boolean;
};

type Phase065QueueableAction = ContractQueueableAction & {
  state: Phase065State;
  reason: string;
  matching_content_items: number;
  mutation_allowed: false;
  authority_granted: false;
};

type Phase065AutoPostContract = ContractAutoPostContract & {
  state: Phase065State;
  reason: string;
  candidate_count: number;
  publish_authority_granted: false;
};

type Phase065LeadFunnelMapping = ContractLeadFunnelMapping & {
  state: Phase065State;
  reason: string;
  source_records_available: number;
  mutation_allowed: false;
};

type Phase065AutomationPath = ContractAutomationPath & {
  state: Phase065State;
  reason: string;
  mutation_allowed: false;
  authority_granted: false;
};

type Phase065StopCondition = {
  condition_id: string;
  triggered: boolean;
  message: string;
};

export type Phase065MarketingAutomation = {
  state: Phase065State;
  reason: string;
  contract_version: string;
  roadmap_ref: "docs/governance/065_MARKETING_AUTOMATION_ROADMAP_v1.md";
  source_of_truth_unchanged: true;
  read_only_first: true;
  mutation_allowed: false;
  authority_granted: false;
  publish_authority_granted: false;
  review_required_before_activation: true;
  queueable_action_inventory: Phase065QueueableAction[];
  auto_post_contracts: Phase065AutoPostContract[];
  lead_funnel_mappings: Phase065LeadFunnelMapping[];
  dry_run_automation_paths: Phase065AutomationPath[];
  controlled_queued_execution: Phase065AutomationPath | null;
  monitoring_and_escalation: Phase065AutomationPath | null;
  stop_conditions: Phase065StopCondition[];
  blocker: string | null;
};

function createStopCondition(conditionId: string, triggered: boolean, message: string): Phase065StopCondition {
  return {
    condition_id: conditionId,
    triggered,
    message
  };
}

function countItemsByState(phase2: Phase2DashboardLoadResult, state: Phase2PipelineState) {
  if (phase2.state === "blocked") return 0;
  return phase2.data.contentItems.filter((item) => item.currentState === state).length;
}

function createQueueableAction(action: ContractQueueableAction, phase2: Phase2DashboardLoadResult): Phase065QueueableAction {
  const phase2Ready = phase2.state === "ready";
  const matchingContentItems = countItemsByState(phase2, action.source_state);

  return {
    ...action,
    state: phase2Ready ? "ready" : "blocked",
    reason: phase2Ready ? "PHASE065_QUEUEABLE_ACTION_READY" : `PHASE065_QUEUEABLE_ACTION_BLOCKED:${phase2.reason ?? "PHASE2_READ_MODEL_BLOCKED"}`,
    matching_content_items: matchingContentItems,
    mutation_allowed: false,
    authority_granted: false
  };
}

function createAutoPostContract(contract: ContractAutoPostContract, phase2: Phase2DashboardLoadResult): Phase065AutoPostContract {
  const phase2Ready = phase2.state === "ready";
  const candidateCount = phase2Ready
    ? phase2.data.contentItems.filter((item) => item.currentState === "QA_passed" || item.currentState === "scheduled").length
    : 0;

  return {
    ...contract,
    state: phase2Ready ? "ready" : "blocked",
    reason: phase2Ready ? "PHASE065_AUTO_POST_CONTRACT_READY:CANDIDATE_ONLY" : `PHASE065_AUTO_POST_CONTRACT_BLOCKED:${phase2.reason ?? "PHASE2_READ_MODEL_BLOCKED"}`,
    candidate_count: candidateCount,
    publish_authority_granted: false
  };
}

function createLeadFunnelMapping(mapping: ContractLeadFunnelMapping, phase2: Phase2DashboardLoadResult): Phase065LeadFunnelMapping {
  const phase2Ready = phase2.state === "ready";

  return {
    ...mapping,
    state: phase2Ready ? "ready" : "blocked",
    reason: phase2Ready ? "PHASE065_LEAD_FUNNEL_MAPPING_READY:READ_ONLY" : `PHASE065_LEAD_FUNNEL_MAPPING_BLOCKED:${phase2.reason ?? "PHASE2_READ_MODEL_BLOCKED"}`,
    source_records_available: phase2Ready ? phase2.data.performanceRecords.length : 0,
    mutation_allowed: false
  };
}

function createAutomationPath(
  path: ContractAutomationPath,
  phase064: Phase064N8nWorkflowContracts,
  phase10: Phase10OperationalExpansion
): Phase065AutomationPath {
  const phase064Ready = phase064.state === "ready";
  const phase10Readable = phase10.surfaces.some((surface) => surface.surface_id === "phase10.search_filter" && surface.state === "ready");
  const hardBlocked = !phase064Ready || !phase10Readable;
  const explicitReviewBlocked = path.activation_status === "BLOCKED_UNTIL_EXPLICIT_REVIEW";

  return {
    ...path,
    state: hardBlocked ? "blocked" : "ready",
    reason: hardBlocked
      ? `PHASE065_AUTOMATION_PATH_BLOCKED:${!phase064Ready ? phase064.reason : "PHASE10_GOVERNANCE_SURFACE_BLOCKED"}`
      : explicitReviewBlocked
        ? "PHASE065_CONTROLLED_QUEUE_CONTRACT_READY:BUT_ACTIVATION_REQUIRES_EXPLICIT_REVIEW"
        : "PHASE065_AUTOMATION_PATH_READY",
    mutation_allowed: false,
    authority_granted: false
  };
}

export function createPhase065MarketingAutomation(input: {
  phase064: Phase064N8nWorkflowContracts;
  phase10: Phase10OperationalExpansion;
  phase2: Phase2DashboardLoadResult;
}): Phase065MarketingAutomation {
  const contractFile = phase065Contracts as ContractFile;
  const queueableActionInventory = contractFile.queueable_actions.map((action) => createQueueableAction(action, input.phase2));
  const autoPostContracts = contractFile.auto_post_contracts.map((contract) => createAutoPostContract(contract, input.phase2));
  const leadFunnelMappings = contractFile.lead_funnel_mappings.map((mapping) => createLeadFunnelMapping(mapping, input.phase2));
  const automationPaths = contractFile.automation_paths.map((path) => createAutomationPath(path, input.phase064, input.phase10));
  const controlledQueuedExecution = automationPaths.find((path) => path.path_id === "065.path.controlled_queued_execution") ?? null;
  const monitoringAndEscalation = automationPaths.find((path) => path.path_id === "065.path.monitoring_escalation") ?? null;

  const stopConditions = [
    createStopCondition(
      "phase065.stop.phase064_blocked",
      input.phase064.state === "blocked",
      input.phase064.blocker ?? input.phase064.reason
    ),
    createStopCondition(
      "phase065.stop.phase2_blocked",
      input.phase2.state === "blocked",
      input.phase2.reason ?? "Phase 2 read model is ready."
    ),
    createStopCondition(
      "phase065.stop.publish_without_review",
      false,
      "Automation must not publish without explicit Human review."
    ),
    createStopCondition(
      "phase065.stop.queue_self_approval",
      false,
      "Automation queue must not approve itself."
    ),
    createStopCondition(
      "phase065.stop.controlled_queue_review_required",
      controlledQueuedExecution?.activation_status === "BLOCKED_UNTIL_EXPLICIT_REVIEW",
      "Controlled queued execution is contract-ready but activation requires explicit review."
    )
  ];
  const hardBlocker = stopConditions.find(
    (condition) =>
      condition.triggered &&
      condition.condition_id !== "phase065.stop.controlled_queue_review_required"
  );
  const allReadOnlySurfacesReady =
    queueableActionInventory.every((action) => action.state === "ready") &&
    autoPostContracts.every((contract) => contract.state === "ready") &&
    leadFunnelMappings.every((mapping) => mapping.state === "ready") &&
    automationPaths.every((path) => path.state === "ready");

  return {
    state: hardBlocker || !allReadOnlySurfacesReady ? "blocked" : "ready",
    reason: hardBlocker || !allReadOnlySurfacesReady ? "PHASE065_MARKETING_AUTOMATION_BLOCKED" : "PHASE065_MARKETING_AUTOMATION_CONTRACTS_READY",
    contract_version: contractFile.contract_version,
    roadmap_ref: contractFile.roadmap_ref,
    source_of_truth_unchanged: true,
    read_only_first: true,
    mutation_allowed: false,
    authority_granted: false,
    publish_authority_granted: false,
    review_required_before_activation: true,
    queueable_action_inventory: queueableActionInventory,
    auto_post_contracts: autoPostContracts,
    lead_funnel_mappings: leadFunnelMappings,
    dry_run_automation_paths: automationPaths.filter((path) => path.mode === "dry_run" || path.activation_status === "DRY_RUN_READY"),
    controlled_queued_execution: controlledQueuedExecution,
    monitoring_and_escalation: monitoringAndEscalation,
    stop_conditions: stopConditions,
    blocker: hardBlocker?.message ?? null
  };
}
