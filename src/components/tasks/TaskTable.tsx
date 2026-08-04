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
      <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl">
        <ClipboardList className="h-10 w-10 text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300">{t("tasks.empty.title") ?? "No Tasks Found"}</h3>
        <p className="text-sm text-slate-500">{t("tasks.empty.description") ?? "Your task queue is currently empty."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
      <div className="border-b border-slate-700/50 bg-slate-800/40 px-5 py-4 text-sm font-semibold text-white flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-indigo-400" />
        {t("tasks.table.title") ?? "Active tasks"}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/50 text-left text-sm">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-[0.1em] text-slate-400">
            <tr>
              <th className="px-6 py-4 font-semibold">{t("tasks.table.task") ?? "Task"}</th>
              <th className="px-6 py-4 font-semibold text-center">{t("tasks.table.status") ?? "Status"}</th>
              <th className="px-6 py-4 font-semibold">{t("tasks.table.assignee") ?? "Assignee"}</th>
              <th className="px-6 py-4 font-semibold">{t("tasks.table.timeline") ?? "Timeline"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {tasks.map((task) => (
              <tr key={task.id} className="transition-colors hover:bg-slate-800/40 text-slate-300">
                <td className="px-6 py-4">
                  <div className="font-semibold text-white">{task.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                    {task.task_key}
                  </div>
                  {task.summary && (
                    <div className="mt-2 text-xs text-slate-400 max-w-md line-clamp-2">{task.summary}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <StateBadge label={task.state} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400">
                      Dept: <span className="font-mono text-slate-300">{task.department_id.split('-')[0]}</span>
                    </span>
                    {task.owner_agent_id ? (
                      <span className="text-xs text-indigo-400 font-semibold">
                        Agent: <span className="font-mono">{task.owner_agent_id.split('-')[0]}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 font-semibold">Unassigned</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
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
