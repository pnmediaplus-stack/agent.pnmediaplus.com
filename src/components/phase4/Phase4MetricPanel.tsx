"use client";

import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase4Metric } from "@/types/phase4";

type Phase4MetricPanelProps = {
  metrics: Phase4Metric[];
};

export function Phase4MetricPanel({ metrics }: Phase4MetricPanelProps) {
  const { t } = useI18n("phase4");

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-950/70">
      <div className="border-b border-slate-700/80 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("phase4.metrics.title") ?? "Execution metrics"}</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {t("phase4.metrics.description") ?? "Read-only runtime health indicators. Missing data remains pending."}
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {t(metric.labelKey) ?? "Metric"}
                </div>
                <div className="mt-3 break-words text-xl font-semibold text-white">{metric.value}</div>
              </div>
              <StateBadge label={metric.state === "succeeded" ? "SUCCEEDED" : metric.state} displayLabel={t(`phase4.state.${metric.state}`) ?? metric.state} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
