import "server-only";

import type { Phase2DashboardLoadResult, Phase2PipelineState, Phase2QaVerdict } from "@/types/phase2";
import type { Phase4DashboardLoadResult, Phase4ExecutionState } from "@/types/phase4";
import type { Phase8HandoffFlow } from "@/lib/phase8-handoff-flow";
import type { Phase9ReadonlyValidationReport } from "@/lib/phase9-readonly-validation";

type JsonObject = Record<string, unknown>;

type Phase10State = "ready" | "blocked";

type Phase10Surface = {
  surface_id: string;
  state: Phase10State;
  reason: string;
  read_only: true;
  mutation_allowed: false;
  source: string;
};

type Phase10SearchItem = {
  id: string;
  label: string;
  entity_type: "department" | "pack" | "handoff" | "workflow" | "content_item" | "performance_record";
  source: string;
  tokens: string[];
};

type Phase10FilterSet = {
  departments: string[];
  packs: string[];
  relationship_types: string[];
  workflow_states: string[];
  content_states: Phase2PipelineState[];
  qa_verdicts: Phase2QaVerdict[];
};

type Phase10Metric = {
  metric_id: string;
  label: string;
  value: number | string | null;
  state: Phase10State;
  source: string;
};

type Phase10Summary = {
  summary_id: string;
  state: Phase10State;
  title: string;
  description: string;
};

type Phase10WorkflowDashboardRow = {
  workflow_ref: string;
  total_traces: number;
  running_traces: number;
  failed_or_blocked_traces: number;
  avg_latency_ms: number | null;
};

type Phase10PerformanceMemoryLink = {
  link_id: string;
  content_item_id: string;
  content_key: string;
  content_title: string;
  performance_record_id: string;
  source_ref: string;
  captured_at: string;
  performance_score: number | null;
};

export type Phase10OperationalExpansion = {
  state: Phase10State;
  reason: string;
  expansion_name: "Phase 10 Operational Expansion";
  read_only: true;
  mutation_allowed: false;
  source_of_truth: "public.department_governance_snapshot + public.phase2_* + public.phase4_* read models";
  surfaces: Phase10Surface[];
  search_index: Phase10SearchItem[];
  filters: Phase10FilterSet;
  metrics: Phase10Metric[];
  summaries: Phase10Summary[];
  workflow_dashboards: Phase10WorkflowDashboardRow[];
  performance_memory_links: Phase10PerformanceMemoryLink[];
};

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function createTokens(values: Array<string | null | undefined>) {
  return uniqueSorted(
    values
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .flatMap((value) => value.toLowerCase().split(/\s+/))
  );
}

function createSurface(surfaceId: string, state: Phase10State, reason: string, source: string): Phase10Surface {
  return {
    surface_id: surfaceId,
    state,
    reason,
    read_only: true,
    mutation_allowed: false,
    source
  };
}

function createMetric(metricId: string, label: string, value: number | string | null, state: Phase10State, source: string): Phase10Metric {
  return {
    metric_id: metricId,
    label,
    value,
    state,
    source
  };
}

function createSummary(summaryId: string, state: Phase10State, title: string, description: string): Phase10Summary {
  return {
    summary_id: summaryId,
    state,
    title,
    description
  };
}

function createGovernanceSearchItems(handoffs: JsonObject[], packs: JsonObject[]): Phase10SearchItem[] {
  const departmentNames = uniqueSorted(
    handoffs.flatMap((handoff) => [
      stringField(handoff.source_department_name),
      stringField(handoff.target_department_name_resolved) ?? stringField(handoff.target_department_name)
    ]).filter((value): value is string => Boolean(value))
  );

  const departmentItems: Phase10SearchItem[] = departmentNames.map((department) => ({
    id: `department:${department}`,
    label: department,
    entity_type: "department",
    source: "public.department_governance_snapshot().handoffs",
    tokens: createTokens([department])
  }));

  const packItems: Phase10SearchItem[] = packs.map((pack) => {
    const packKey = stringField(pack.pack_key) ?? "unknown_pack";
    const packName = stringField(pack.pack_name) ?? packKey;

    return {
      id: `pack:${packKey}`,
      label: packName,
      entity_type: "pack",
      source: "public.department_governance_snapshot().packs",
      tokens: createTokens([packKey, packName, stringField(pack.qa_expectation)])
    };
  });

  const handoffItems: Phase10SearchItem[] = handoffs.map((handoff, index) => {
    const sourceDepartment = stringField(handoff.source_department_name) ?? "unknown_source";
    const targetDepartment = stringField(handoff.target_department_name_resolved) ?? stringField(handoff.target_department_name) ?? "unknown_target";
    const relationshipType = stringField(handoff.relationship_type) ?? "unknown_relationship";
    const id = stringField(handoff.id) ?? `handoff:${index}`;

    return {
      id: `handoff:${id}`,
      label: `${sourceDepartment} -> ${targetDepartment}`,
      entity_type: "handoff",
      source: "public.department_governance_snapshot().handoffs",
      tokens: createTokens([sourceDepartment, targetDepartment, relationshipType])
    };
  });

  return [...departmentItems, ...packItems, ...handoffItems];
}

function createRuntimeSearchItems(runtime: Phase4DashboardLoadResult): Phase10SearchItem[] {
  return runtime.data.traces.map((trace) => ({
    id: `workflow:${trace.id}`,
    label: trace.workflowRef,
    entity_type: "workflow",
    source: "public.phase4_execution_traces",
    tokens: createTokens([trace.id, trace.workflowRef, trace.requestRef, trace.taskRef, trace.currentState])
  }));
}

function createContentSearchItems(phase2: Phase2DashboardLoadResult): Phase10SearchItem[] {
  return phase2.data.contentItems.map((item) => ({
    id: `content_item:${item.id}`,
    label: item.title,
    entity_type: "content_item",
    source: "public.phase2_content_items",
    tokens: createTokens([item.contentKey, item.title, item.ownerRef, item.currentState, item.taskOwnerRef])
  }));
}

function createFilters(handoffs: JsonObject[], packs: JsonObject[], phase2: Phase2DashboardLoadResult, runtime: Phase4DashboardLoadResult): Phase10FilterSet {
  return {
    departments: uniqueSorted(
      handoffs.flatMap((handoff) => [
        stringField(handoff.source_department_name),
        stringField(handoff.target_department_name_resolved) ?? stringField(handoff.target_department_name)
      ]).filter((value): value is string => Boolean(value))
    ),
    packs: uniqueSorted(packs.map((pack) => stringField(pack.pack_key)).filter((value): value is string => Boolean(value))),
    relationship_types: uniqueSorted(handoffs.map((handoff) => stringField(handoff.relationship_type)).filter((value): value is string => Boolean(value))),
    workflow_states: uniqueSorted(runtime.data.traces.map((trace) => trace.currentState)),
    content_states: Array.from(new Set(phase2.data.contentItems.map((item) => item.currentState))),
    qa_verdicts: Array.from(new Set(phase2.data.qaReviews.map((review) => review.verdict)))
  };
}

function createWorkflowDashboard(runtime: Phase4DashboardLoadResult): Phase10WorkflowDashboardRow[] {
  const groups = new Map<string, { traces: typeof runtime.data.traces }>();

  for (const trace of runtime.data.traces) {
    const workflowRef = trace.workflowRef || "pending / incomplete";
    const group = groups.get(workflowRef) ?? { traces: [] };
    group.traces.push(trace);
    groups.set(workflowRef, group);
  }

  return Array.from(groups.entries()).map(([workflowRef, group]) => {
    const latencyValues = group.traces
      .map((trace) => trace.latencyMs)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    return {
      workflow_ref: workflowRef,
      total_traces: group.traces.length,
      running_traces: group.traces.filter((trace) => trace.currentState === "running" || trace.currentState === "queued").length,
      failed_or_blocked_traces: group.traces.filter((trace) => trace.currentState === "failed" || trace.currentState === "blocked").length,
      avg_latency_ms: latencyValues.length ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : null
    };
  });
}

function createPerformanceMemoryLinks(phase2: Phase2DashboardLoadResult): Phase10PerformanceMemoryLink[] {
  const contentById = new Map(phase2.data.contentItems.map((item) => [item.id, item]));

  return phase2.data.performanceRecords.map((record) => {
    const content = contentById.get(record.contentItemId);

    return {
      link_id: `performance_memory:${record.id}`,
      content_item_id: record.contentItemId,
      content_key: content?.contentKey ?? "pending / incomplete",
      content_title: content?.title ?? "pending / incomplete",
      performance_record_id: record.id,
      source_ref: record.sourceRef,
      captured_at: record.capturedAt,
      performance_score: numberOrNull(record.performance_score)
    };
  });
}

export function createPhase10OperationalExpansion(input: {
  registry: JsonObject | null;
  packs: JsonObject[];
  handoffs: JsonObject[];
  phase8Flow: Phase8HandoffFlow;
  phase9Report: Phase9ReadonlyValidationReport;
  runtime: Phase4DashboardLoadResult;
  phase2: Phase2DashboardLoadResult;
}): Phase10OperationalExpansion {
  const governanceReady = Boolean(input.registry) && input.packs.length > 0 && input.handoffs.length > 0;
  const runtimeReady = input.runtime.state === "ready";
  const phase2Ready = input.phase2.state === "ready";
  const validationReady = input.phase8Flow.state === "ready" && input.phase9Report.state === "ready";

  const surfaces = [
    createSurface(
      "phase10.search_filter",
      governanceReady ? "ready" : "blocked",
      governanceReady ? "PHASE10_SEARCH_FILTER_READY" : "PHASE10_SEARCH_FILTER_BLOCKED:GOVERNANCE_DATA_MISSING",
      "public.department_governance_snapshot"
    ),
    createSurface(
      "phase10.metrics",
      runtimeReady && governanceReady ? "ready" : "blocked",
      runtimeReady && governanceReady ? "PHASE10_METRICS_READY" : `PHASE10_METRICS_BLOCKED:${input.runtime.reason || "GOVERNANCE_DATA_MISSING"}`,
      "public.phase4_* + public.department_governance_snapshot"
    ),
    createSurface(
      "phase10.summaries",
      validationReady ? "ready" : "blocked",
      validationReady ? "PHASE10_SUMMARIES_READY" : "PHASE10_SUMMARIES_BLOCKED:VALIDATION_NOT_READY",
      "data.phase8_handoff_flow + data.phase9_validation_report"
    ),
    createSurface(
      "phase10.workflow_dashboards",
      runtimeReady ? "ready" : "blocked",
      runtimeReady ? "PHASE10_WORKFLOW_DASHBOARDS_READY" : `PHASE10_WORKFLOW_DASHBOARDS_BLOCKED:${input.runtime.reason}`,
      "public.phase4_execution_traces"
    ),
    createSurface(
      "phase10.performance_memory_links",
      phase2Ready ? "ready" : "blocked",
      phase2Ready ? "PHASE10_PERFORMANCE_MEMORY_LINKS_READY" : `PHASE10_PERFORMANCE_MEMORY_LINKS_BLOCKED:${input.phase2.reason ?? "PHASE2_DATA_BLOCKED"}`,
      "public.phase2_content_items + public.phase2_performance_records"
    )
  ];

  const state = surfaces.some((surface) => surface.state === "blocked") ? "blocked" : "ready";
  const searchIndex = governanceReady
    ? [
        ...createGovernanceSearchItems(input.handoffs, input.packs),
        ...(runtimeReady ? createRuntimeSearchItems(input.runtime) : []),
        ...(phase2Ready ? createContentSearchItems(input.phase2) : [])
      ]
    : [];
  const workflowDashboards = runtimeReady ? createWorkflowDashboard(input.runtime) : [];
  const performanceMemoryLinks = phase2Ready ? createPerformanceMemoryLinks(input.phase2) : [];

  return {
    state,
    reason: state === "ready" ? "PHASE10_OPERATIONAL_EXPANSION_READY" : "PHASE10_OPERATIONAL_EXPANSION_BLOCKED",
    expansion_name: "Phase 10 Operational Expansion",
    read_only: true,
    mutation_allowed: false,
    source_of_truth: "public.department_governance_snapshot + public.phase2_* + public.phase4_* read models",
    surfaces,
    search_index: searchIndex,
    filters: createFilters(input.handoffs, input.packs, input.phase2, input.runtime),
    metrics: [
      createMetric("phase10.metric.packs", "Department packs", input.packs.length, governanceReady ? "ready" : "blocked", "public.department_governance_snapshot().packs"),
      createMetric("phase10.metric.handoffs", "Handoff links", input.handoffs.length, governanceReady ? "ready" : "blocked", "public.department_governance_snapshot().handoffs"),
      createMetric("phase10.metric.traces", "Runtime traces", input.runtime.data.traces.length, runtimeReady ? "ready" : "blocked", "public.phase4_execution_traces"),
      createMetric("phase10.metric.successRate", "Runtime success rate", input.runtime.data.metricsSnapshot?.successRatePct ?? null, runtimeReady ? "ready" : "blocked", "public.phase4_execution_metrics"),
      createMetric("phase10.metric.contentItems", "Content items", input.phase2.data.contentItems.length, phase2Ready ? "ready" : "blocked", "public.phase2_content_items"),
      createMetric("phase10.metric.performanceRecords", "Performance records", input.phase2.data.performanceRecords.length, phase2Ready ? "ready" : "blocked", "public.phase2_performance_records")
    ],
    summaries: [
      createSummary(
        "phase10.summary.governance",
        governanceReady ? "ready" : "blocked",
        "Governance read surface",
        governanceReady ? "Department governance read surface is available." : "Department governance read surface is incomplete."
      ),
      createSummary(
        "phase10.summary.validation",
        validationReady ? "ready" : "blocked",
        "Validation posture",
        validationReady ? "Read-only validation is passing." : "Read-only validation is blocked or incomplete."
      ),
      createSummary(
        "phase10.summary.runtime",
        runtimeReady ? "ready" : "blocked",
        "Runtime operations",
        runtimeReady ? "Runtime read models are available for operational dashboards." : input.runtime.reason
      ),
      createSummary(
        "phase10.summary.performanceMemory",
        phase2Ready ? "ready" : "blocked",
        "Performance memory",
        phase2Ready ? "Performance memory links are available." : input.phase2.reason ?? "Phase 2 data is blocked."
      )
    ],
    workflow_dashboards: workflowDashboards,
    performance_memory_links: performanceMemoryLinks
  };
}
