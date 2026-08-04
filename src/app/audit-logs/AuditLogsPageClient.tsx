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
      title={t("audit.page.title") ?? "Nhật ký Audit"}
      purpose={t("audit.page.purpose") ?? "Lưu vết sự kiện cho các lệnh, thay đổi trạng thái workflow và hành động phê duyệt."}
      statusLabel={t("audit.page.statusLabel") ?? "Trình xem audit"}
      statusValue="ACTIVE"
      statusDisplayValue={t("audit.state.ACTIVE") ?? "Hoạt động"}
      allowedActions={[
        t("audit.page.allowed.inspectTrail") ?? "Xem lưu vết",
        t("audit.page.allowed.traceCommands") ?? "Theo dõi lệnh",
        t("audit.page.allowed.reviewDecisions") ?? "Xem lại quyết định"
      ]}
      forbiddenActions={[
        t("audit.page.forbidden.modifyLogs") ?? "Sửa nhật ký",
        t("audit.page.forbidden.deleteEvents") ?? "Xóa sự kiện",
        t("audit.page.forbidden.bypassAudit") ?? "Bỏ qua audit"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">Đang tải nhật ký audit...</div>
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
