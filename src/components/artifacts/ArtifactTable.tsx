"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { Artifact } from "@/types/artifact";
import { StateBadge } from "@/components/shared/StateBadge";

export function ArtifactTable({ artifacts }: { artifacts: Artifact[] }) {
  const { t } = useI18n("artifacts");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-5 py-4 text-sm font-semibold text-white">{t("artifacts.table.title") ?? "Artifact registry"}</div>
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th className="px-5 py-3">{t("artifacts.table.artifact") ?? "Artifact"}</th>
            <th className="px-5 py-3">{t("artifacts.table.type") ?? "Type"}</th>
            <th className="px-5 py-3">{t("artifacts.table.department") ?? "Department"}</th>
            <th className="px-5 py-3">{t("artifacts.table.state") ?? "State"}</th>
            <th className="px-5 py-3">{t("artifacts.table.version") ?? "Version"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {artifacts.map((artifact) => (
            <tr key={artifact.id} className="text-slate-300">
              <td className="px-5 py-4">
                <div className="font-medium text-white">{artifact.title}</div>
                <div className="text-xs text-slate-500">{artifact.updatedAt}</div>
              </td>
              <td className="px-5 py-4">{artifact.type}</td>
              <td className="px-5 py-4">{artifact.departmentId}</td>
              <td className="px-5 py-4">
                <StateBadge label={artifact.state} />
              </td>
              <td className="px-5 py-4">{artifact.version}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
