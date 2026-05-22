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
        title={t("phase4.page.title") ?? "Execution Observability"}
        purpose={t("phase4.page.purpose") ?? "Read-only execution tracing for workflow runs, receipts, retries, latency, and audit outcomes."}
        statusLabel={t("phase4.page.statusLabel") ?? "Phase 4 status"}
        statusValue={loadState === "ready" ? "READY" : "BLOCKED"}
        allowedActions={[
          t("phase4.page.allowed.traceExecutions") ?? "Trace executions",
          t("phase4.page.allowed.inspectReceipts") ?? "Inspect receipts",
          t("phase4.page.allowed.reviewFailures") ?? "Review failures"
        ]}
        forbiddenActions={[
          t("phase4.page.forbidden.runtimeMutation") ?? "Mutate runtime workflows",
          t("phase4.page.forbidden.retryExecution") ?? "Trigger retries automatically",
          t("phase4.page.forbidden.publishAuthority") ?? "Grant publish authority"
        ]}
      />

      {loadState === "blocked" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-100">{t("phase4.blocked.title") ?? "Observability data map blocked"}</div>
              <p className="mt-1 text-sm leading-6 text-amber-100/80">
                {t("phase4.blocked.description") ?? "Phase 4 is read-only and fails closed until an approved runtime read model is available."}
              </p>
            </div>
            <StateBadge label="BLOCKED" displayLabel={t("phase4.state.blocked") ?? "Blocked"} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            {t("phase4.labels.reason") ?? "Reason"}: {loadReason}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label={t("phase4.summary.traces") ?? "Traces"} value={data.metricsSnapshot?.totalTraces === null || !data.metricsSnapshot ? (t("phase4.common.pending") ?? "pending / incomplete") : String(data.metricsSnapshot.totalTraces)} />
        <SummaryCard label={t("phase4.summary.running") ?? "Running"} value={String(running)} />
        <SummaryCard label={t("phase4.summary.failures") ?? "Failures"} value={data.metricsSnapshot?.blockedTraces === null || !data.metricsSnapshot ? (t("phase4.common.pending") ?? "pending / incomplete") : String(data.metricsSnapshot.blockedTraces)} />
        <SummaryCard label={t("phase4.summary.successRate") ?? "Success rate"} value={successRate === null ? (t("phase4.common.pending") ?? "pending / incomplete") : `${successRate}%`} />
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
