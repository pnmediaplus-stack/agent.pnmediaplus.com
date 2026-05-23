import "server-only";

import phase064Contracts from "../../n8n/webhook-contracts/064_N8N_WORKFLOW_CONTRACTS.json";
import type { Phase063WorkflowOrchestration } from "@/lib/phase063-workflow-orchestration";

type Phase064State = "ready" | "blocked";

type Phase064WorkflowMapping = {
  workflow_id: string;
  build_order: number;
  mode: string;
  state: Phase064State;
  reason: string;
  input_contract: string;
  output_contract: string;
  activation_status: "READ_ONLY_READY" | "DRY_RUN_READY" | "BLOCKED_UNTIL_EXPLICIT_REVIEW" | "BLOCKED";
};

type Phase064StopCondition = {
  condition_id: string;
  triggered: boolean;
  message: string;
};

export type Phase064N8nWorkflowContracts = {
  state: Phase064State;
  reason: string;
  contract_version: string;
  roadmap_ref: "docs/governance/064_N8N_WORKFLOW_BUILD_ROADMAP_v1.md";
  source_of_truth_unchanged: true;
  read_only_first: true;
  mutation_allowed: false;
  authority_granted: false;
  review_required_before_activation: true;
  workflow_mapping: Phase064WorkflowMapping[];
  stop_conditions: Phase064StopCondition[];
  blocker: string | null;
};

type ContractWorkflow = {
  workflow_id: string;
  build_order: number;
  mode: string;
  input_contract: string;
  output_contract: string;
  activation_status?: string;
};

type ContractFile = {
  contract_version: string;
  roadmap_ref: "docs/governance/064_N8N_WORKFLOW_BUILD_ROADMAP_v1.md";
  review_required_before_activation: boolean;
  workflows: ContractWorkflow[];
};

function createStopCondition(conditionId: string, triggered: boolean, message: string): Phase064StopCondition {
  return {
    condition_id: conditionId,
    triggered,
    message
  };
}

function createMapping(workflow: ContractWorkflow, phase063: Phase063WorkflowOrchestration): Phase064WorkflowMapping {
  if (workflow.workflow_id === "064.read_only_validation") {
    const stage = phase063.stages.find((item) => item.stage_id === "phase063.read_only_validation");
    return {
      workflow_id: workflow.workflow_id,
      build_order: workflow.build_order,
      mode: workflow.mode,
      state: stage?.state ?? "blocked",
      reason: stage?.reason ?? "PHASE064_READ_ONLY_VALIDATION_STAGE_MISSING",
      input_contract: workflow.input_contract,
      output_contract: workflow.output_contract,
      activation_status: stage?.state === "ready" ? "READ_ONLY_READY" : "BLOCKED"
    };
  }

  if (workflow.workflow_id === "064.dry_run_orchestration") {
    const stage = phase063.stages.find((item) => item.stage_id === "phase063.dry_run_orchestration");
    return {
      workflow_id: workflow.workflow_id,
      build_order: workflow.build_order,
      mode: workflow.mode,
      state: stage?.state ?? "blocked",
      reason: stage?.reason ?? "PHASE064_DRY_RUN_STAGE_MISSING",
      input_contract: workflow.input_contract,
      output_contract: workflow.output_contract,
      activation_status: stage?.state === "ready" ? "DRY_RUN_READY" : "BLOCKED"
    };
  }

  if (workflow.workflow_id === "064.controlled_live_observation") {
    const stage = phase063.stages.find((item) => item.stage_id === "phase063.controlled_live_workflow");
    return {
      workflow_id: workflow.workflow_id,
      build_order: workflow.build_order,
      mode: workflow.mode,
      state: stage?.state ?? "blocked",
      reason: stage?.reason ?? "PHASE064_CONTROLLED_LIVE_STAGE_MISSING",
      input_contract: workflow.input_contract,
      output_contract: workflow.output_contract,
      activation_status: "BLOCKED_UNTIL_EXPLICIT_REVIEW"
    };
  }

  const stage = phase063.stages.find((item) => item.stage_id === "phase063.drift_monitoring_escalation");
  return {
    workflow_id: workflow.workflow_id,
    build_order: workflow.build_order,
    mode: workflow.mode,
    state: stage?.state ?? "blocked",
    reason: stage?.reason ?? "PHASE064_MONITORING_STAGE_MISSING",
    input_contract: workflow.input_contract,
    output_contract: workflow.output_contract,
    activation_status: stage?.state === "ready" ? "READ_ONLY_READY" : "BLOCKED"
  };
}

export function createPhase064N8nWorkflowContracts(phase063: Phase063WorkflowOrchestration): Phase064N8nWorkflowContracts {
  const contractFile = phase064Contracts as ContractFile;
  const workflowMapping = contractFile.workflows.map((workflow) => createMapping(workflow, phase063));
  const controlledLiveActivationBlocked = workflowMapping.some(
    (workflow) => workflow.workflow_id === "064.controlled_live_observation" && workflow.activation_status === "BLOCKED_UNTIL_EXPLICIT_REVIEW"
  );
  const stopConditions = [
    createStopCondition(
      "phase064.stop.phase063_blocked",
      phase063.state === "blocked",
      phase063.blocker ?? "Phase 063 orchestration prerequisite is ready."
    ),
    createStopCondition(
      "phase064.stop.runtime_self_approval",
      phase063.stop_conditions.some((condition) => condition.condition_id === "phase063.stop.runtime_self_approval" && condition.triggered),
      "Runtime must not approve itself."
    ),
    createStopCondition(
      "phase064.stop.live_activation_review_required",
      controlledLiveActivationBlocked,
      "Controlled live workflow contracts are built, but activation requires explicit review."
    )
  ];
  const blockingStop = stopConditions.find((condition) => condition.triggered);

  return {
    state: phase063.state === "ready" && workflowMapping.every((workflow) => workflow.state === "ready") ? "ready" : "blocked",
    reason:
      phase063.state === "ready" && workflowMapping.every((workflow) => workflow.state === "ready")
        ? "PHASE064_N8N_WORKFLOW_CONTRACTS_READY"
        : "PHASE064_N8N_WORKFLOW_CONTRACTS_BLOCKED",
    contract_version: contractFile.contract_version,
    roadmap_ref: contractFile.roadmap_ref,
    source_of_truth_unchanged: true,
    read_only_first: true,
    mutation_allowed: false,
    authority_granted: false,
    review_required_before_activation: true,
    workflow_mapping: workflowMapping,
    stop_conditions: stopConditions,
    blocker: blockingStop?.message ?? null
  };
}
