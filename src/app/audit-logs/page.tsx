"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { useI18n } from "@/lib/i18n/useI18n";
import { auditLogs } from "@/lib/mock-data";

export default function AuditLogsPage() {
  const { t } = useI18n("audit");

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
      <AuditLogTable logs={auditLogs} />
    </PageFrame>
  );
}
