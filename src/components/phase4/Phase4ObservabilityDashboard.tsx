"use client";

import { Phase4AuditTrail } from "@/components/phase4/Phase4AuditTrail";
import { Phase4MetricPanel } from "@/components/phase4/Phase4MetricPanel";
import { Phase4TraceTable } from "@/components/phase4/Phase4TraceTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StateBadge } from "@/components/shared/StateBadge";
import {
  calculatePhase4SuccessRate,
  countPhase4RunningTraces
} from "@/lib/phase4-observability-derivations";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase4DashboardData, Phase4LoadState } from "@/types/phase4";

type Phase4ObservabilityDashboardProps = {
  data: Phase4DashboardData;
  loadReason: string;
  loadState: Phase4LoadState;
};

export function Phase4ObservabilityDashboard({ data, loadReason, loadState }: Phase4ObservabilityDashboardProps) {
  const { t } = useI18n("phase4");
  const running = countPhase4RunningTraces(data);
  const successRate = calculatePhase4SuccessRate(data);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("phase4.page.title") ?? "Giám sát thực thi"}
        purpose={t("phase4.page.purpose") ?? "Theo dõi thực thi chỉ đọc cho quy trình chạy, biên lai, thử lại, độ trễ và kết quả kiểm toán."}
        statusLabel={t("phase4.page.statusLabel") ?? "Trạng thái Phase 4"}
        statusValue={loadState === "ready" ? "READY" : "BLOCKED"}
        allowedActions={[
          t("phase4.page.allowed.traceExecutions") ?? "Theo dõi thực thi",
          t("phase4.page.allowed.inspectReceipts") ?? "Xem biên lai",
          t("phase4.page.allowed.reviewFailures") ?? "Xem lỗi"
        ]}
        forbiddenActions={[
          t("phase4.page.forbidden.runtimeMutation") ?? "Thay đổi runtime quy trình",
          t("phase4.page.forbidden.retryExecution") ?? "Tự động kích hoạt thử lại",
          t("phase4.page.forbidden.publishAuthority") ?? "Cấp quyền xuất bản"
        ]}
      />

      {loadState === "blocked" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-100">{t("phase4.blocked.title") ?? "Dữ liệu giám sát bị chặn"}</div>
              <p className="mt-1 text-sm leading-6 text-amber-100/80">
                {t("phase4.blocked.description") ?? "Phase 4 chỉ đọc và đóng cho đến khi có mô hình đọc runtime được duyệt."}
              </p>
            </div>
            <StateBadge label="BLOCKED" displayLabel={t("phase4.state.blocked") ?? "Bị chặn"} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            {t("phase4.labels.reason") ?? "Lý do"}: {loadReason}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label={t("phase4.summary.traces") ?? "Số lượt chạy"} value={data.metricsSnapshot?.totalTraces === null || !data.metricsSnapshot ? (t("phase4.common.pending") ?? "đang chờ / chưa hoàn tất") : String(data.metricsSnapshot.totalTraces)} />
        <SummaryCard label={t("phase4.summary.running") ?? "Đang chạy"} value={String(running)} />
        <SummaryCard label={t("phase4.summary.failures") ?? "Thất bại"} value={data.metricsSnapshot?.blockedTraces === null || !data.metricsSnapshot ? (t("phase4.common.pending") ?? "đang chờ / chưa hoàn tất") : String(data.metricsSnapshot.blockedTraces)} />
        <SummaryCard label={t("phase4.summary.successRate") ?? "Tỷ lệ thành công"} value={successRate === null ? (t("phase4.common.pending") ?? "đang chờ / chưa hoàn tất") : `${successRate}%`} />
      </div>

      <Phase4MetricPanel metrics={data.metrics} />
      <Phase4TraceTable traces={data.traces} />
      <Phase4AuditTrail events={data.auditEvents} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-3 break-words text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
