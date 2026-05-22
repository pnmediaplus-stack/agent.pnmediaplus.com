"use client";

import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase3Metric } from "@/types/phase3";

type Phase3MetricsPanelProps = {
  metrics: Phase3Metric[];
};

export function Phase3MetricsPanel({ metrics }: Phase3MetricsPanelProps) {
  const { t } = useI18n("phase3");

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70 shadow-[0_0_0_1px_rgba(15,23,42,0.22)]">
      <div className="border-b border-slate-700/80 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("phase3.metrics.title") ?? "Read-only metrics"}</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {t("phase3.metrics.description") ?? "Phase 3 metrics are display-only until a canonical data map is approved."}
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {t(metric.labelKey) ?? "Metric"}
                </div>
                <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
              </div>
              <StateBadge
                label={metric.state === "ready" ? "READY" : metric.state}
                displayLabel={t(`phase3.status.${metric.state}`) ?? metric.state}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
