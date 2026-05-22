"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Gate } from "@/types/gate";

export function GateCard({ gate }: { gate: Gate }) {
  const { t } = useI18n("gates");
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{gate.name}</div>
          <div className="mt-1 text-sm text-slate-400">{gate.rationale}</div>
        </div>
        <StateBadge label={gate.status} />
      </div>
      <div className="mt-4 text-sm text-slate-300">{t("gates.card.owner") ?? "Owner"}: {gate.owner}</div>
    </div>
  );
}
