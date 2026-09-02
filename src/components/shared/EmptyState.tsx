 "use client";

import { useI18n } from "@/lib/i18n/useI18n";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  const { t } = useI18n("shared");
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 p-10 text-center shadow-sm">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-400/5 blur-3xl"></div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <div className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">{title}</div>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description || t("shared.page.noDataDescription")}</p>
      </div>
    </div>
  );
}
