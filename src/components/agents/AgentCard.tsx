"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Agent } from "@/types/agent";
import { Bot, Building2, Target } from "lucide-react";
import Link from "next/link";

export function AgentCard({ agent, href }: { agent: Agent, href?: string }) {
  const { t } = useI18n("agents");
  const cardContent = (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-xl shadow-sm dark:shadow-xl dark:shadow-black/20 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-cyan-300 dark:hover:border-slate-700/50 cursor-pointer">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50">
            <Bot className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{agent.canonical_name}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-mono">{agent.role_code}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StateBadge label={agent.state} />
        </div>
      </div>
      
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/50 p-3 text-sm text-slate-700 dark:text-slate-300">
          <Target className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="text-xs uppercase tracking-wider text-slate-500 mr-2">Scope:</span>
          <div className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-300">{agent.authority_scope}</div>
        </div>
        
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 mt-2">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{t("agents.card.department") ?? "Department"}: <span className="font-mono text-slate-600 dark:text-slate-400">{agent.department_id.split('-')[0]}...</span></span>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href as any} className="block group">
      {cardContent}
    </Link>
  ) : cardContent;
}
