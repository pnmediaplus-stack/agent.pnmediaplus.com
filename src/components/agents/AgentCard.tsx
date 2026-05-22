"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Agent } from "@/types/agent";

export function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useI18n("agents");
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{agent.name}</div>
          <div className="text-sm text-slate-400">{agent.role}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StateBadge label={agent.status} />
          <StateBadge label={agent.state} />
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
        {agent.focus}
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
        {t("agents.card.department") ?? "Department"}: {agent.departmentId}
      </div>
    </div>
  );
}
