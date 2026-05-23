"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Department } from "@/types/department";

export function DepartmentCard({ department }: { department: Department }) {
  const { t } = useI18n("departments");
  const stateLabel = getDepartmentStateLabel(department.state, t);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{department.name}</div>
          <div className="mt-1 text-sm text-slate-400">{department.purpose}</div>
        </div>
        <StateBadge label={department.state} displayLabel={stateLabel} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label={t("departments.card.owner") ?? "Owner"} value={department.owner} />
        <Stat label={t("departments.card.agents") ?? "Agents"} value={department.activeAgents} />
        <Stat label={t("departments.card.openTasks") ?? "Open tasks"} value={department.openTasks} />
        <Stat label={t("departments.card.id") ?? "Id"} value={department.id} />
      </div>
    </div>
  );
}

function getDepartmentStateLabel(state: Department["state"], t: ReturnType<typeof useI18n>["t"]) {
  switch (state) {
    case "REVIEW":
      return t("departments.state.review") ?? "Reviewing";
    case "PARTIAL":
      return t("departments.state.partial") ?? "Partially operational";
    default:
      return state;
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
