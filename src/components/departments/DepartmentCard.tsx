"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Department } from "@/types/department";
import { UserCircle2, Users, ListTodo, Key } from "lucide-react";

export function DepartmentCard({ department }: { department: Department }) {
  const { t } = useI18n("departments");
  const stateLabel = getDepartmentStateLabel(department.state, t);
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-xl shadow-2xl shadow-black/20 transition-all hover:bg-slate-900/60 hover:border-slate-700/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{department.canonical_name}</div>
          <div className="mt-2 text-sm leading-relaxed text-slate-400">{department.description || 'No description provided.'}</div>
        </div>
        <div className="shrink-0">
          <StateBadge label={department.state} displayLabel={stateLabel} />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Stat icon={<UserCircle2 className="h-4 w-4 text-cyan-500" />} label={t("departments.card.key") ?? "Key"} value={department.department_key} />
        <Stat icon={<Key className="h-4 w-4 text-rose-400" />} label={t("departments.card.id") ?? "Id"} value={department.id.split('-')[0]} />
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

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800/60 bg-slate-950/50 p-3.5 transition-colors hover:bg-slate-950/80">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      </div>
      <div className="mt-2.5 truncate text-sm font-medium text-white">{value}</div>
    </div>
  );
}
