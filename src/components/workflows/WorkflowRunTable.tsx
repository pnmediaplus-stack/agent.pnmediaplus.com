"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";
import { StateBadge } from "@/components/shared/StateBadge";

type WorkflowRunTableProps = {
  runs: WorkflowRun[];
  namespace?: "workflows" | "n8n";
};

export function WorkflowRunTable({ runs, namespace = "workflows" }: WorkflowRunTableProps) {
  const { t } = useI18n(namespace);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-5 py-4 text-sm font-semibold text-white">{t(`${namespace}.table.title`) ?? "Workflow runs"}</div>
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th className="px-5 py-3">{t(`${namespace}.table.run`) ?? "Run"}</th>
            <th className="px-5 py-3">{t(`${namespace}.table.workflow`) ?? "Workflow"}</th>
            <th className="px-5 py-3">{t(`${namespace}.table.status`) ?? "Status"}</th>
            <th className="px-5 py-3">{t(`${namespace}.table.duration`) ?? "Duration"}</th>
            <th className="px-5 py-3">{t(`${namespace}.table.target`) ?? "Target"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {runs.map((run) => (
            <tr key={run.id} className="text-slate-300">
              <td className="px-5 py-4">
                <div className="font-medium text-white">{run.name}</div>
                <div className="text-xs text-slate-500">{run.id}</div>
              </td>
              <td className="px-5 py-4">{run.workflowKey}</td>
              <td className="px-5 py-4">
                <StateBadge label={run.status} />
              </td>
              <td className="px-5 py-4">{run.duration}</td>
              <td className="px-5 py-4">{run.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
