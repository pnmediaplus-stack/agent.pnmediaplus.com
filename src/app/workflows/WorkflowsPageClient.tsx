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
        if (!res.ok) throw new Error("Không thể tải quy trình");
        
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (error) {
        console.error(error);
        toast.error("Lỗi tải quy trình");
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
      title={t("workflows.page.title") ?? "Bảng quy trình"}
      purpose={t("workflows.page.purpose") ?? "Bảng quy trình cho việc chuyển trạng thái, trạng thái chạy và các điểm kiểm tra an toàn."}
      statusLabel={t("workflows.page.statusLabel") ?? "Bảng quy trình"}
      statusValue="WAITING_ON_HUMAN"
      statusDisplayValue={t("workflows.state.WAITING_ON_HUMAN") ?? "Chờ duyệt"}
      allowedActions={[
        t("workflows.page.allowed.viewRunStatus") ?? "Xem trạng thái chạy",
        t("workflows.page.allowed.viewCheckpoints") ?? "Xem điểm kiểm tra",
        t("workflows.page.allowed.holdForHuman") ?? "Giữ để Human review"
      ]}
      forbiddenActions={[
        t("workflows.page.forbidden.autoLaunch") ?? "Khởi chạy tự động",
        t("workflows.page.forbidden.deployProd") ?? "Triển khai Production",
        t("workflows.page.forbidden.skipGate") ?? "Bỏ qua trạng thái"
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
