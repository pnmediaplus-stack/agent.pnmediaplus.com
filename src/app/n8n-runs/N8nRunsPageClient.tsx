"use client";

import { useState, useEffect } from "react";
import { PageFrame } from "@/components/shared/PageFrame";
import { WorkflowRunTable } from "@/components/workflows/WorkflowRunTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function N8nRunsPageClient() {
  const { t } = useI18n("n8n");
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch("/api/workflow-runs");
        if (!res.ok) throw new Error("Failed to fetch workflow runs");
        
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (error) {
        console.error(error);
        toast.error("Error loading n8n runs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
  }, []);

  return (
    <PageFrame bannerKey="n8n_runs_banner"
      title={t("n8n.page.title") ?? "n8n Runs"}
      purpose={t("n8n.page.purpose") ?? "Monitor safe run status from n8n without exposing secrets or triggering launch workflows."}
      statusLabel={t("n8n.page.statusLabel") ?? "n8n run monitor"}
      statusValue="RUNNING"
      allowedActions={[
        t("n8n.page.allowed.inspectRunStatus") ?? "Inspect run status",
        t("n8n.page.allowed.reviewCheckpoints") ?? "Review request payload",
        t("n8n.page.allowed.holdForHumanReview") ?? "Wait on human approval"
      ]}
      forbiddenActions={[
        t("n8n.page.forbidden.automaticLaunch") ?? "Call real publish workflow",
        t("n8n.page.forbidden.productionDeploy") ?? "Launch automatically",
        t("n8n.page.forbidden.stateBypass") ?? "Skip human gate"
      ]}
    >
      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/30">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : (
        <WorkflowRunTable namespace="n8n" runs={runs} />
      )}
    </PageFrame>
  );
}
