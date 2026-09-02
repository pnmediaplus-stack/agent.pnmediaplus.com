 "use client";

import { useI18n } from "@/lib/i18n/useI18n";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  const { t } = useI18n("shared");
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-8 text-center">
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description || t("shared.page.noDataDescription")}</p>
    </div>
  );
}
