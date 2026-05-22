import { Phase4ObservabilityDashboard } from "@/components/phase4/Phase4ObservabilityDashboard";
import { loadPhase4ObservabilityData } from "@/lib/phase4-observability-loader";

export const dynamic = "force-dynamic";

export default async function Phase4Page() {
  const result = await loadPhase4ObservabilityData();

  return <Phase4ObservabilityDashboard data={result.data} loadReason={result.reason} loadState={result.state} />;
}
