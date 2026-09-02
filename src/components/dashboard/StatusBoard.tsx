 "use client";

import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";

type StatusItem = {
  label: string;
  value: string;
  note: string;
};

export function StatusBoard({ items }: { items: StatusItem[] }) {
  const { t } = useI18n("shared");
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-5">
      <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{t("shared.status.system") ?? "System status"}</div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.note}</div>
            </div>
            <StateBadge label={item.value} />
          </div>
        ))}
      </div>
    </div>
  );
}
