 "use client";

import type { AuditLog } from "@/types/audit";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n/useI18n";

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const { t } = useI18n("audit");
  if (!logs.length) {
    return (
      <EmptyState
        title={t("audit.empty.title") ?? "No audit events"}
        description={t("audit.empty.description") ?? "Audit records will appear here when local commands, approvals, or mock workflow actions are captured."}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("audit.table.title") ?? "Audit log"}</div>
        <div className="mt-1 text-xs text-slate-400">{t("audit.table.description") ?? "Immutable local event trace with readable details and timestamps."}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[840px] divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th className="px-5 py-3">{t("audit.table.time") ?? "Time"}</th>
            <th className="px-5 py-3">{t("audit.table.entity") ?? "Entity"}</th>
            <th className="px-5 py-3">{t("audit.table.action") ?? "Action"}</th>
            <th className="px-5 py-3">{t("audit.table.actor") ?? "Actor"}</th>
            <th className="px-5 py-3">{t("audit.table.details") ?? "Details"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {logs.map((log) => (
            <tr key={log.id} className="text-slate-300">
              <td className="px-5 py-4 text-xs text-slate-500">{log.createdAt}</td>
              <td className="px-5 py-4">
                {log.entityType} / {log.entityId}
              </td>
              <td className="px-5 py-4">{log.action}</td>
              <td className="px-5 py-4">{log.actor}</td>
              <td className="px-5 py-4">{log.details}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
