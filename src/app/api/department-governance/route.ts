import { createHash } from "node:crypto";
import { loadDepartmentGovernanceDbBundle } from "@/lib/department-governance-db-loader";
import { createPhase8HandoffFlow } from "@/lib/phase8-handoff-flow";
import { loadPhase4ObservabilityData } from "@/lib/phase4-observability-loader";
import { createPhase9ReadonlyValidationReport } from "@/lib/phase9-readonly-validation";
import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";
import { createPhase10OperationalExpansion } from "@/lib/phase10-operational-expansion";
import { createPhase063WorkflowOrchestration } from "@/lib/phase063-workflow-orchestration";
import { createPhase064N8nWorkflowContracts } from "@/lib/phase064-n8n-workflow-contracts";
import { createPhase065MarketingAutomation } from "@/lib/phase065-marketing-automation";
import { createPhase066MarketingMediaOperationsWorkflow } from "@/lib/phase066-marketing-media-operations-workflow";
import { loadPhase066Snapshot } from "@/lib/phase066-snapshot-loader";
import { verifyUiAuth } from "@/lib/ui-auth-guard";

export const dynamic = "force-dynamic";

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function createBundleFingerprint(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export async function GET(req: Request) {
  const guard = await verifyUiAuth(req);
  if (!guard.ok) return guard.response;

  const loaded = await loadDepartmentGovernanceDbBundle();

  if (loaded.state === "blocked") {
    return Response.json(
      {
        ok: false,
        state: "blocked",
        reason: loaded.reason,
        bundle_version: null,
        bundle_fingerprint: null,
        source_of_truth: "public.department_governance_snapshot",
        source_files: null,
        data: null
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const bundle = loaded.data;
  const phase8HandoffFlow = createPhase8HandoffFlow(bundle.snapshot.handoffs);
  const [runtimeReadModel, phase2ReadModel, phase066Snapshot] = await Promise.all([
    loadPhase4ObservabilityData(),
    loadPhase2DashboardData(),
    loadPhase066Snapshot()
  ]);
  const phase9ValidationReport = createPhase9ReadonlyValidationReport(phase8HandoffFlow, runtimeReadModel);
  const phase063WorkflowOrchestration = createPhase063WorkflowOrchestration({
    phase8Flow: phase8HandoffFlow,
    phase9Report: phase9ValidationReport,
    runtime: runtimeReadModel
  });
  const phase064N8nWorkflowContracts = createPhase064N8nWorkflowContracts(phase063WorkflowOrchestration);
  const phase10OperationalExpansion = createPhase10OperationalExpansion({
    registry: bundle.snapshot.registry,
    packs: bundle.snapshot.packs,
    handoffs: bundle.snapshot.handoffs,
    phase8Flow: phase8HandoffFlow,
    phase9Report: phase9ValidationReport,
    runtime: runtimeReadModel,
    phase2: phase2ReadModel
  });
  const phase065MarketingAutomation = createPhase065MarketingAutomation({
    phase064: phase064N8nWorkflowContracts,
    phase10: phase10OperationalExpansion,
    phase2: phase2ReadModel
  });
  const phase066MarketingMediaOperationsWorkflow = createPhase066MarketingMediaOperationsWorkflow({
    phase8Flow: phase8HandoffFlow,
    phase065: phase065MarketingAutomation,
    phase2: phase2ReadModel,
    phase066Snapshot
  });
  const payload = {
    registry: bundle.snapshot.registry,
    packs: bundle.snapshot.packs,
    handoff_contract: {
      handoffs: bundle.snapshot.handoffs
    },
    phase8_handoff_flow: phase8HandoffFlow,
    phase9_validation_report: phase9ValidationReport,
    phase063_workflow_orchestration: phase063WorkflowOrchestration,
    phase064_n8n_workflow_contracts: phase064N8nWorkflowContracts,
    phase10_operational_expansion: phase10OperationalExpansion,
    phase065_marketing_automation: phase065MarketingAutomation,
    phase066_marketing_media_operations_workflow: phase066MarketingMediaOperationsWorkflow
  };

  return Response.json(
    {
      ok: true,
      state: "ready",
      reason: loaded.reason,
      bundle_version: bundle.bundleVersion,
      bundle_fingerprint: createBundleFingerprint(payload),
      source_of_truth: "public.department_governance_snapshot",
      source_files: bundle.sourceFiles,
      data: payload
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
