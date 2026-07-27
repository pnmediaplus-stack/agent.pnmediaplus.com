import { loadWorkflowRuns } from "@/lib/phase1-loader";
import { OperationsPageClient } from "./OperationsPageClient";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const res = await loadWorkflowRuns();

  return <OperationsPageClient runs={res.data} />;
}
