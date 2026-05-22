import { Phase3Dashboard } from "@/components/phase3/Phase3Dashboard";
import { loadPhase3DashboardData } from "@/lib/phase3-dashboard-loader";

export const dynamic = "force-dynamic";

export default async function Phase3Page() {
  const result = await loadPhase3DashboardData();

  return <Phase3Dashboard data={result.data} loadReason={result.reason} loadState={result.state} />;
}
