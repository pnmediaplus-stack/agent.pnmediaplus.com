"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { Task } from "@/types/task";
import { StateBadge } from "@/components/shared/StateBadge";
import { Clock, AlertCircle, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const { t, locale } = useI18n("tasks");
  const dateLocale = locale === "vi" ? vi : enUS;

  function getPriorityColor(priority: number) {
    if (priority >= 80) return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    if (priority >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  }

  function getPriorityLabel(priority: number) {
    if (priority >= 80) return "HIGH";
    if (priority >= 50) return "MEDIUM";
    return "LOW";
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="relative overflow-hidden flex flex-col items-center justify-center py-16 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/50 bg-gradient-to-b from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 shadow-sm">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-400/5 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-400/5 blur-3xl"></div>
        
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800/50 mb-4">
          <ClipboardList className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 relative z-10">{t("tasks.empty.title") ?? "Không tìm thấy tác vụ nào."}</h3>
        <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 relative z-10">{t("tasks.empty.description") ?? "Hàng đợi tác vụ hiện đang trống."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900 px-5 py-4 text-sm font-semibold text-indigo-900 dark:text-white flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        {t("tasks.table.title") ?? "Tác vụ đang chạy"}
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("tasks.table.task") ?? "Tác vụ"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold text-center">{t("tasks.table.status") ?? "Trạng thái"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("tasks.table.assignee") ?? "Người thực hiện"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("tasks.table.timeline") ?? "Thời gian"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {tasks.map((task) => (
              <tr key={task.id} className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-300">
                <td className="px-6 py-4 align-top">
                  <div className="font-semibold text-slate-900 dark:text-white">{task.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    {task.task_key}
                  </div>
                  {task.summary && (
                    <div className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-md line-clamp-2">{task.summary}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center align-top">
                  <StateBadge label={task.state} displayLabel={t(`tasks.state.${task.state}`) ?? task.state} />
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                      {t("tasks.table.dept") ?? "Phòng ban"}: <span className="font-mono text-slate-600 dark:text-slate-300 ml-1">{task.department_id.split('-')[0]}</span>
                    </span>
                    {task.owner_agent_id ? (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        {t("tasks.table.agent") ?? "Agent"}: <span className="font-mono ml-1">{task.owner_agent_id.split('-')[0]}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">{t("tasks.table.unassigned") ?? "Chưa giao"}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: dateLocale })}</span>
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
