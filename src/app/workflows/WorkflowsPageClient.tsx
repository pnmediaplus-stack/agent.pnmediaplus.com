"use client";

import { useState, useEffect, useMemo } from "react";
import { PageFrame } from "@/components/shared/PageFrame";
import { WorkflowRunTable } from "@/components/workflows/WorkflowRunTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function WorkflowsPageClient() {
  const { t } = useI18n("workflows");
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch("/api/workflow-runs");
        if (!res.ok) throw new Error("Failed to fetch workflows");
        
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (error) {
        console.error(error);
        toast.error("Error loading workflows");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
  }, []);

  // For the Workflow Board overview, we group by workflow_key to show unique workflows
  // and pick the latest run (assuming the API sorts by created_at DESC)
  const uniqueWorkflows = useMemo(() => {
    const map = new Map<string, WorkflowRun>();
    for (const run of runs) {
      if (!map.has(run.workflow_key)) {
        map.set(run.workflow_key, run);
      }
    }
    return Array.from(map.values());
  }, [runs]);

  return (
    <PageFrame
      title={t("workflows.page.title") ?? "Workflow Board"}
      purpose={t("workflows.page.purpose") ?? "Bảng workflow cho chuyển trạng thái, status run và các checkpoint handoff an toàn."}
      statusLabel={t("workflows.page.statusLabel") ?? "Trạng thái hiện tại"}
      statusValue="WAITING_ON_HUMAN"
      allowedActions={[
        t("workflows.page.allowed.viewRunStatus") ?? "Xem trạng thái run",
        t("workflows.page.allowed.viewCheckpoints") ?? "Xem checkpoint",
        t("workflows.page.allowed.holdForHuman") ?? "Giữ để Human review"
      ]}
      forbiddenActions={[
        t("workflows.page.forbidden.autoLaunch") ?? "Tự động launch",
        t("workflows.page.forbidden.deployProd") ?? "Deploy production",
        t("workflows.page.forbidden.skipGate") ?? "Bỏ qua state"
      ]}
    >
      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/30">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : (
        <WorkflowRunTable namespace="workflows" runs={uniqueWorkflows} />
      )}
    </PageFrame>
  );
}
