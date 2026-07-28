import { Phase2Dashboard } from "@/components/dashboard/Phase2DashboardLive";
import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";

export default async function MediaPipelinePage() {
  // Server-side data fetching
  const result = await loadPhase2DashboardData();

  return (
    <Phase2Dashboard
      data={result.data}
      loadState={result.state}
      loadReason={result.reason}
    />
  );
}
