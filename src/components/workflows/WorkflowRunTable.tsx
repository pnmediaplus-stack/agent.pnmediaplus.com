"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";
import { StateBadge } from "@/components/shared/StateBadge";
import { Clock, Activity, Target } from "lucide-react";
import { formatDistanceToNow, formatDistance } from "date-fns";

type WorkflowRunTableProps = {
  runs: WorkflowRun[];
  namespace?: "workflows" | "n8n";
};

export function WorkflowRunTable({ runs, namespace = "workflows" }: WorkflowRunTableProps) {
  const { t } = useI18n(namespace);

  if (!runs || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl">
        <Activity className="h-10 w-10 text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300">No Runs Found</h3>
        <p className="text-sm text-slate-500">There are currently no active workflow runs.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
      <div className="border-b border-slate-700/50 bg-slate-800/40 px-5 py-4 text-sm font-semibold text-white flex items-center gap-2">
        <Activity className="h-4 w-4 text-indigo-400" />
        {t(`${namespace}.table.title`) ?? "Workflow runs"}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/50 text-left text-sm">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-[0.1em] text-slate-400">
            <tr>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.run`) ?? "Run Info"}</th>
              <th className="px-6 py-4 font-semibold text-center">{t(`${namespace}.table.status`) ?? "Status"}</th>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.duration`) ?? "Timing"}</th>
              <th className="px-6 py-4 font-semibold">{t(`${namespace}.table.target`) ?? "Refs"}</th>
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
                  <StateBadge label={run.run_status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs text-slate-400">
                    {run.started_at && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Started: {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</span>
                      </div>
                    )}
                    {run.finished_at && run.started_at && (
                      <div className="text-emerald-400 font-medium">
                        Took {formatDistance(new Date(run.started_at), new Date(run.finished_at))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs">
                    {run.task_id && (
                      <span className="text-indigo-400 font-mono">Task: {run.task_id.split('-')[0]}</span>
                    )}
                    {run.n8n_execution_id ? (
                      <span className="text-amber-500 font-mono">n8n: {run.n8n_execution_id}</span>
                    ) : (
                      <span className="text-slate-500 italic">No n8n execution</span>
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
