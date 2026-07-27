import { loadWorkflowRuns } from "@/lib/phase1-loader";
import { N8nRunsPageClient } from "./N8nRunsPageClient";

export const dynamic = "force-dynamic";

export default async function N8nRunsPage() {
  const res = await loadWorkflowRuns();

  return <N8nRunsPageClient workflowRuns={res.data} />;
}
