import { Phase2Dashboard } from "@/components/dashboard/Phase2Dashboard";
import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const liveData = await loadPhase2DashboardData();

  return (
    <Phase2Dashboard
      data={liveData.data}
      loadState={liveData.state}
      loadReason={liveData.reason}
    />
  );
}
