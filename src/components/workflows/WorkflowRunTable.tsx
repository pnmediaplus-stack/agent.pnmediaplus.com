"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";
import { StateBadge } from "@/components/shared/StateBadge";
import { Clock, Activity, Target } from "lucide-react";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { vi, enUS } from "date-fns/locale";

type WorkflowRunTableProps = {
  runs: WorkflowRun[];
  namespace?: "workflows" | "n8n";
};

export function WorkflowRunTable({ runs, namespace = "workflows" }: WorkflowRunTableProps) {
  const { t, locale } = useI18n(namespace);
  const dateLocale = locale === "vi" ? vi : enUS;

  if (!runs || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl">
        <Activity className="h-10 w-10 text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300">{t(`${namespace}.empty.title`) ?? "Không tìm thấy Run nào"}</h3>
        <p className="text-sm text-slate-500">{t(`${namespace}.empty.description`) ?? "Hiện tại không có workflow run nào đang hoạt động."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
      <div className="border-b border-slate-700/50 bg-slate-800/40 px-5 py-4 text-sm font-semibold text-white flex items-center gap-2">
        <Activity className="h-4 w-4 text-indigo-400" />
        {t(`${namespace}.table.title`) ?? "Các lượt chạy quy trình"}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/50 text-left text-sm">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-[0.1em] text-slate-400">
            <tr>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.run`) ?? "Lượt chạy"}</th>
              <th className="px-6 py-4 font-semibold text-center">{t(`${namespace}.table.status`) ?? "Trạng thái"}</th>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.duration`) ?? "Thời lượng"}</th>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.target`) ?? "Mục tiêu"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {runs.map((run) => (
              <tr key={run.id} className="transition-colors hover:bg-slate-800/40 text-slate-300">
                <td className="px-6 py-4">
                  <div className="font-semibold text-white">{run.workflow_name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                    {run.workflow_key}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <StateBadge label={run.run_status} displayLabel={t(`${namespace}.state.${run.run_status}`) ?? run.run_status} />
                    {run.context_status && (
                      <span className={run.context_status === "error" ? "max-w-[220px] truncate rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-300" : "max-w-[220px] truncate rounded-full border border-slate-600/50 bg-slate-800/50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300"}>
                        {run.context_status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs text-slate-400">
                    {run.started_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{t(`${namespace}.table.started`) ?? "Đã bắt đầu"}: {formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: dateLocale })}</span>
                      </div>
                    )}
                    {run.finished_at && run.started_at && (
                      <div className="text-emerald-400 font-medium">
                        {t(`${namespace}.table.took`) ?? "Mất"} {formatDistance(new Date(run.started_at), new Date(run.finished_at), { locale: dateLocale })}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs">
                    {run.task_id && (
                      <span className="text-indigo-400 font-mono">{t(`${namespace}.table.taskRef`) ?? "Tác vụ"}: {run.task_id.split('-')[0]}</span>
                    )}
                    {run.n8n_execution_id ? (
                      <span className="text-amber-500 font-mono">n8n: {run.n8n_execution_id}</span>
                    ) : (
                      <span className="text-slate-500 italic">{t(`${namespace}.table.noN8n`) ?? "Không có dữ liệu n8n"}</span>
                    )}
                    {run.context_last_error && (
                      <span className="line-clamp-2 text-rose-300">
                        {run.context_last_error}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
