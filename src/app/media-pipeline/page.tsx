import { Phase2Dashboard } from "@/components/dashboard/Phase2DashboardLive";
import { loadPhase2DashboardData } from "@/lib/phase2-dashboard-loader";

export default async function MediaPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const rawPage = parseInt(resolvedSearchParams.page as string, 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  // Server-side data fetching
  const result = await loadPhase2DashboardData(page, 20);

  return (
    <Phase2Dashboard
      data={result.data}
      loadState={result.state}
      loadReason={result.reason}
    />
  );
}
