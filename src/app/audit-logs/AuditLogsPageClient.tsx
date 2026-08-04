"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { AuditLog } from "@/types/audit";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AuditLogsPageClient() {
  const { t } = useI18n("audit");
  const { data, error, isLoading } = useSWR<{ audit_logs: AuditLog[] }>("/api/audit-logs", fetcher);

  return (
    <PageFrame
      title={t("audit.page.title") ?? "Audit Logs"}
      purpose={t("audit.page.purpose") ?? "Event trail for commands, workflow state changes, and approval actions."}
      statusLabel={t("audit.page.statusLabel") ?? "Audit viewer"}
      statusValue="APPROVED"
      allowedActions={[
        t("audit.page.allowed.inspectTrail") ?? "Inspect trail",
        t("audit.page.allowed.traceCommands") ?? "Trace commands",
        t("audit.page.allowed.reviewDecisions") ?? "Review decisions"
      ]}
      forbiddenActions={[
        t("audit.page.forbidden.editHistoricalEvents") ?? "Edit historical events",
        t("audit.page.forbidden.hideApprovalTrace") ?? "Hide approval trace",
        t("audit.page.forbidden.deleteCommandHistory") ?? "Delete command history"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">Loading audit logs...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load audit logs</div>
        </div>
      ) : (
        <AuditLogTable logs={data?.audit_logs ?? []} />
      )}
    </PageFrame>
  );
}
