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
          <div className="text-lg font-semibold text-white capitalize">
            {t(`gates.names.${gate.gate_key}`) ?? gate.canonical_name ?? gate.gate_key ?? 'Unknown'}
          </div>
          <div className="mt-1 text-sm text-slate-400">{t(`gates.rules.${gate.gate_key}`) ?? gate.rule_summary ?? "-"}</div>
        </div>
        <StateBadge label={gate.state} displayLabel={t(`gates.state.${gate.state}`) ?? gate.state} />
      </div>
      <div className="mt-4 flex flex-col gap-1 text-sm text-slate-300">
        <div>{t("gates.card.type") ?? "Type"}: <span className="font-semibold">{t(`gates.kind.${gate.gate_kind}`) ?? gate.gate_kind}</span></div>
        <div>{t("gates.card.appliesTo") ?? "Applies To"}: <span className="font-semibold">{t(`gates.entity.${gate.applies_to_entity_type}`) ?? gate.applies_to_entity_type}</span></div>
      </div>
    </div>
  );
}
