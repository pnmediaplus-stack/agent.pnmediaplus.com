"use client";

import { Phase3MetricsPanel } from "@/components/phase3/Phase3MetricsPanel";
import { Phase3Rail } from "@/components/phase3/Phase3Rail";
import { PageHeader } from "@/components/shared/PageHeader";
import { StateBadge } from "@/components/shared/StateBadge";
import { countPhase3BlockedSurfaces, countPhase3ReadySurfaces } from "@/lib/phase3-dashboard-derivations";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase3DashboardData, Phase3LoadState } from "@/types/phase3";

type Phase3DashboardProps = {
  data: Phase3DashboardData;
  loadReason: string;
  loadState: Phase3LoadState;
};

export function Phase3Dashboard({ data, loadReason, loadState }: Phase3DashboardProps) {
  const { t } = useI18n("phase3");
  const readySurfaces = countPhase3ReadySurfaces(data);
  const blockedSurfaces = countPhase3BlockedSurfaces(data);
  const isLive = loadState === "ready";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("phase3.page.title") ?? "Phase 3 Operations"}
        purpose={
          t("phase3.page.purpose") ??
          "Read-only operational scaffold on top of the Phase 2 live baseline. No new write paths are enabled."
        }
        statusLabel={t("phase3.page.statusLabel") ?? "Phase 3 status"}
        statusValue={isLive ? "LIVE" : "BLOCKED"}
        allowedActions={[
          t("phase3.page.allowed.inspectSurfaces") ?? "Inspect read-only surfaces",
          t("phase3.page.allowed.reviewReadiness") ?? "Review readiness blockers",
          t("phase3.page.allowed.compareMetrics") ?? "Compare display-only metrics"
        ]}
        forbiddenActions={[
          t("phase3.page.forbidden.mutations") ?? "Create mutation paths",
          t("phase3.page.forbidden.publishAuthority") ?? "Grant publish authority",
          t("phase3.page.forbidden.runtimeChanges") ?? "Modify n8n runtime"
        ]}
      />

      {isLive ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-100">
                {t("phase3.live.title") ?? "Phase 3 live read enabled"}
              </div>
              <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                {t("phase3.live.description") ??
                  "Phase 3 now resolves against the Phase 2 live baseline via public Supabase views."}
              </p>
            </div>
            <StateBadge label="ONLINE" displayLabel={t("phase3.status.ready") ?? "Live"} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            {t("phase3.labels.reason") ?? "Reason"}: {loadReason}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-100">{t("phase3.blocked.title") ?? "Phase 3 data map blocked"}</div>
              <p className="mt-1 text-sm leading-6 text-amber-100/80">
                {t("phase3.blocked.description") ??
                  "The scaffold is active, but live reads remain disabled until Human approves the Phase 3 business data map."}
              </p>
            </div>
            <StateBadge label="BLOCKED" displayLabel={t("phase3.status.blocked") ?? "Blocked"} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            {t("phase3.labels.reason") ?? "Reason"}: {loadReason}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={t("phase3.summary.surfaces") ?? "Surfaces"} value={String(data.surfaces.length)} />
        <SummaryCard label={t("phase3.summary.ready") ?? "Ready"} value={String(readySurfaces)} />
        <SummaryCard label={t("phase3.summary.blocked") ?? "Blocked"} value={String(blockedSurfaces)} />
      </div>

      <Phase3Rail surfaces={data.surfaces} />
      <Phase3MetricsPanel metrics={data.metrics} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
