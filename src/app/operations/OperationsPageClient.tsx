"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { OperationsExecutionSurface } from "@/components/operations/OperationsExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function OperationsPageClient() {
  const { t } = useI18n("operations");
  const { data, error, isLoading } = useSWR<{ runs: WorkflowRun[] }>("/api/workflow-runs", fetcher);

  return (
    <PageFrame bannerKey="operations_banner"
      title={t("operations.page.title") ?? "Operations execution"}
      purpose={t("operations.page.purpose") ?? "Read-only operations surface for workflow execution, routing, monitoring, escalation, and customer output."}
      statusLabel={t("operations.page.statusLabel") ?? "Operations surface"}
      statusValue="RUNNING"
      statusDisplayValue={t("operations.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("operations.page.allowed.inspectExecution") ?? "Inspect execution",
        t("operations.page.allowed.reviewRouting") ?? "Review routing",
        t("operations.page.allowed.previewEscalations") ?? "Preview escalations"
      ]}
      forbiddenActions={[
        t("operations.page.forbidden.mutateRuntime") ?? "Mutate runtime",
        t("operations.page.forbidden.startPublish") ?? "Start publish",
        t("operations.page.forbidden.selfApprove") ?? "Self-approve"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-900 dark:text-white/50">Loading operations execution...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load operations execution</div>
        </div>
      ) : (
        <OperationsExecutionSurface workflowRuns={data?.runs ?? []} />
      )}
    </PageFrame>
  );
}
