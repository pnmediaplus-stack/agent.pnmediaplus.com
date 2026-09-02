"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { Artifact } from "@/types/artifact";
import { StateBadge } from "@/components/shared/StateBadge";
import { Database } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function ArtifactTable({ artifacts }: { artifacts: Artifact[] }) {
  const { t } = useI18n("artifacts");

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="relative overflow-hidden flex flex-col items-center justify-center py-16 rounded-2xl border border-cyan-200/60 dark:border-cyan-800/50 bg-gradient-to-b from-white to-cyan-50/50 dark:from-slate-900 dark:to-cyan-950/20 shadow-sm">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-400/5 blur-3xl"></div>
        
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-500 shadow-sm border border-cyan-200 dark:border-cyan-800/50 mb-4">
          <Database className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 relative z-10">{t("artifacts.empty.title") ?? "Chưa có tài nguyên nào."}</h3>
        <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 relative z-10">{t("artifacts.empty.description") ?? "Kho lưu trữ tài nguyên hiện đang trống."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-100 dark:border-cyan-900/50 bg-white dark:bg-slate-900 shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-cyan-100 dark:border-cyan-900/50 bg-gradient-to-r from-cyan-50/50 to-white dark:from-cyan-950/30 dark:to-slate-900 px-5 py-4 text-sm font-bold tracking-tight text-cyan-900 dark:text-white flex items-center gap-2">
        <Database className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        {t("artifacts.table.title") ?? "Kho lưu trữ tài nguyên"}
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("artifacts.table.artifact") ?? "Tài nguyên"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("artifacts.table.type") ?? "Loại"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("artifacts.table.department") ?? "Phòng ban"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("artifacts.table.state") ?? "Trạng thái"}</th>
              <th className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold">{t("artifacts.table.version") ?? "Phiên bản"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {artifacts.map((artifact) => (
              <tr key={artifact.id} className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-300">
                <td className="px-6 py-4 align-top">
                  <div className="font-semibold text-slate-900 dark:text-white">{artifact.canonical_name}</div>
                  <div className="mt-1 text-[11px] font-mono text-slate-400">{new Date(artifact.updated_at).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 align-top text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {artifact.artifact_type}
                  </span>
                </td>
                <td className="px-6 py-4 align-top">
                  <span className="truncate max-w-[150px] inline-block font-mono text-[11px] text-slate-500" title={artifact.department_id}>
                    {artifact.department_id.split('-')[0]}...
                  </span>
                </td>
                <td className="px-6 py-4 align-top">
                  <StateBadge label={artifact.state} />
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="inline-flex items-center justify-center min-w-[2rem] rounded bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
                    {artifact.version_label}
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
