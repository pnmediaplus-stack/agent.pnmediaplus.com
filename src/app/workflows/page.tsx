import { loadWorkflowRuns } from "@/lib/phase1-loader";
import { WorkflowsPageClient } from "./WorkflowsPageClient";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const res = await loadWorkflowRuns();

  return <WorkflowsPageClient runs={res.data} />;
}
