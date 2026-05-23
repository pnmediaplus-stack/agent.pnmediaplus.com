import "server-only";

type JsonObject = Record<string, unknown>;

export type Phase8HandoffFlowNode = {
  department_name: string;
  position: number;
};

export type Phase8HandoffFlowEdge = {
  from_department: string;
  to_department: string;
  relationship_type: string;
  source: "public.department_governance_snapshot().handoffs";
  source_handoff_id: string | null;
};

export type Phase8HandoffFlow =
  | {
      state: "ready";
      reason: "PHASE8_HANDOFF_FLOW_READY";
      flow_name: "Marketing-Media-Operations-Customer-Business Truth";
      nodes: Phase8HandoffFlowNode[];
      edges: Phase8HandoffFlowEdge[];
      missing_links: [];
      read_only: true;
      mutation_allowed: false;
    }
  | {
      state: "blocked";
      reason: string;
      flow_name: "Marketing-Media-Operations-Customer-Business Truth";
      nodes: Phase8HandoffFlowNode[];
      edges: Phase8HandoffFlowEdge[];
      missing_links: string[];
      read_only: true;
      mutation_allowed: false;
    };

const PHASE8_CHAIN = ["Marketing", "Media", "Operations", "Customer", "Business Truth"] as const;

const REQUIRED_PAIRS = [
  ["Marketing", "Media"],
  ["Media", "Operations"],
  ["Operations", "Customer"],
  ["Customer", "Business Truth"]
] as const;

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolField(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function normalizeDepartmentPair(left: string, right: string) {
  return [left, right].sort((a, b) => a.localeCompare(b)).join("::");
}

function createNodeList(): Phase8HandoffFlowNode[] {
  return PHASE8_CHAIN.map((departmentName, index) => ({
    department_name: departmentName,
    position: index + 1
  }));
}

function createEdgeFromHandoff(handoff: JsonObject): Phase8HandoffFlowEdge | null {
  const isActive = boolField(handoff.is_active);
  const relationshipType = stringField(handoff.relationship_type);
  const sourceDepartment = stringField(handoff.source_department_name);
  const targetDepartment = stringField(handoff.target_department_name_resolved) ?? stringField(handoff.target_department_name);

  if (isActive !== true || relationshipType !== "HANDOFF_TARGET" || !sourceDepartment || !targetDepartment) {
    return null;
  }

  if (!PHASE8_CHAIN.includes(sourceDepartment as (typeof PHASE8_CHAIN)[number])) return null;
  if (!PHASE8_CHAIN.includes(targetDepartment as (typeof PHASE8_CHAIN)[number])) return null;

  return {
    from_department: sourceDepartment,
    to_department: targetDepartment,
    relationship_type: relationshipType,
    source: "public.department_governance_snapshot().handoffs",
    source_handoff_id: stringField(handoff.id)
  };
}

export function createPhase8HandoffFlow(handoffs: JsonObject[]): Phase8HandoffFlow {
  const nodes = createNodeList();
  const edges = handoffs
    .map(createEdgeFromHandoff)
    .filter((edge): edge is Phase8HandoffFlowEdge => Boolean(edge));
  const connectedPairs = new Set(edges.map((edge) => normalizeDepartmentPair(edge.from_department, edge.to_department)));
  const missingLinks = REQUIRED_PAIRS
    .filter(([left, right]) => !connectedPairs.has(normalizeDepartmentPair(left, right)))
    .map(([left, right]) => `${left}<->${right}`);

  if (missingLinks.length > 0) {
    return {
      state: "blocked",
      reason: `PHASE8_HANDOFF_FLOW_MISSING_LINKS:${missingLinks.join(",")}`,
      flow_name: "Marketing-Media-Operations-Customer-Business Truth",
      nodes,
      edges,
      missing_links: missingLinks,
      read_only: true,
      mutation_allowed: false
    };
  }

  return {
    state: "ready",
    reason: "PHASE8_HANDOFF_FLOW_READY",
    flow_name: "Marketing-Media-Operations-Customer-Business Truth",
    nodes,
    edges,
    missing_links: [],
    read_only: true,
    mutation_allowed: false
  };
}
