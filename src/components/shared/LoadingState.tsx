 "use client";

import { useI18n } from "@/lib/i18n/useI18n";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n("shared");
  const resolvedLabel = label ?? (t("shared.loading.title") ?? "Loading workspace");
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
      <div className="mt-4 text-sm font-medium text-white">{resolvedLabel}</div>
      <p className="mt-2 text-sm text-slate-400">{t("shared.loading.description") ?? "Please wait while the local shell renders data safely."}</p>
    </div>
  );
}
