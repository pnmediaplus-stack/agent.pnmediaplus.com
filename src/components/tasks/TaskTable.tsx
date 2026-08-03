"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { Task } from "@/types/task";
import { StateBadge } from "@/components/shared/StateBadge";
import { Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const { t } = useI18n("tasks");

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
        <AlertCircle className="h-10 w-10 text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300">No Tasks Found</h3>
        <p className="text-sm text-slate-500">There are currently no tasks assigned to this organization.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Task Info</th>
              <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-center">State</th>
              <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-center">Priority</th>
              <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Assignment</th>
              <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {tasks.map((task) => (
              <tr key={task.id} className="transition-colors hover:bg-slate-800/40">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-200">{task.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                    {task.task_key}
                  </div>
                  {task.summary && (
                    <div className="mt-2 text-xs text-slate-400 line-clamp-2">{task.summary}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <StateBadge label={task.state} />
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)} ({task.priority})
                  </span>
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
                    <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
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
