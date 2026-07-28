import { Phase2DashboardLive } from "@/components/dashboard/Phase2DashboardLive";
import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";

export default async function MediaPipelinePage() {
  // Server-side data fetching
  const result = await loadPhase2DashboardData();

  return (
    <Phase2DashboardLive
      data={result.data}
      loadState={result.state}
      loadReason={result.reason}
    />
  );
}
