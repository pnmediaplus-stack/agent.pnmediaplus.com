"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Agent } from "@/types/agent";
import { Bot, Building2, Target } from "lucide-react";

export function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useI18n("agents");
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-xl shadow-xl shadow-black/20 transition-all hover:bg-slate-900/60 hover:border-slate-700/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800/80 border border-slate-700/50">
            <Bot className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{agent.name}</div>
            <div className="mt-1 text-sm text-slate-400">{agent.role}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StateBadge label={agent.status} />
          <StateBadge label={agent.state} />
        </div>
      </div>
      
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-xl border border-slate-800/60 bg-slate-950/50 p-3 text-sm text-slate-300">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="font-mono text-xs leading-relaxed">{agent.focus}</div>
        </div>
        
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{t("agents.card.department") ?? "Department"}: <span className="font-mono">{agent.departmentId}</span></span>
        </div>
      </div>
    </div>
  );
}
