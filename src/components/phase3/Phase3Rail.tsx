"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase3Surface } from "@/types/phase3";

type Phase3RailProps = {
  surfaces: Phase3Surface[];
};

export function Phase3Rail({ surfaces }: Phase3RailProps) {
  const { t } = useI18n("phase3");

  return (
    <section className="min-w-0 rounded-2xl border border-slate-700/80 bg-slate-950/70 shadow-[0_0_0_1px_rgba(15,23,42,0.22)]">
      <div className="border-b border-slate-700/80 px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{t("phase3.rail.title") ?? "Operational surfaces"}</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {t("phase3.rail.description") ?? "Read-only surfaces are contained in one horizontal rail."}
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            {t("phase3.labels.readOnly") ?? "Read-only"}
          </span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto overflow-y-hidden p-4">
        {surfaces.length ? (
          <div className="flex w-max flex-row items-stretch gap-4">
            {surfaces.map((surface) => (
              <article
                key={surface.id}
                className="w-80 flex-shrink-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-base font-semibold text-white">{t(surface.titleKey) ?? "Surface"}</h3>
                  <StateBadge
                    label={surface.state === "ready" ? "READY" : surface.state}
                    displayLabel={t(`phase3.status.${surface.state}`) ?? surface.state}
                  />
                </div>
                <p className="mt-3 min-h-16 break-words text-sm leading-6 text-slate-400">
                  {t(surface.purposeKey) ?? "Awaiting approved Phase 3 specification."}
                </p>
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t("phase3.labels.owner") ?? "Owner"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-200">{surface.owner}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("phase3.empty.title") ?? "No Phase 3 surfaces"}
            description={t("phase3.empty.description") ?? "Phase 3 waits for an approved data map before live rendering."}
          />
        )}
      </div>
    </section>
  );
}
