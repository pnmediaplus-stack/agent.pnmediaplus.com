"use client";

import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";

type PageHeaderProps = {
  title: string;
  purpose: string;
  statusLabel: string;
  statusValue: string;
  statusDisplayValue?: string;
  allowedActions: string[];
  forbiddenActions?: string[];
};

export function PageHeader({
  title,
  purpose,
  statusLabel,
  statusValue,
  statusDisplayValue,
  allowedActions,
  forbiddenActions = []
}: PageHeaderProps) {
  const { t } = useI18n("shared");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/75 shadow-[0_0_0_1px_rgba(15,23,42,0.22)] backdrop-blur">
      <div className="border-b border-cyan-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] px-5 py-5 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">{statusLabel}</p>
          <div className="inline-flex items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
            <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{purpose}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("shared.page.currentStatus") ?? "Trạng thái hiện tại"}</div>
          <div className="mt-2">
            <StateBadge label={statusValue} displayLabel={statusDisplayValue} />
          </div>
        </div>
      </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ActionGroup
          title={t("shared.page.allowedActions") ?? "Hành động được phép"}
          items={allowedActions}
          tone="emerald"
          emptyLabel={t("shared.none") ?? "Không có"}
        />
        <ActionGroup
          title={t("shared.page.forbiddenActions") ?? "Hành động bị cấm"}
          items={forbiddenActions}
          tone="rose"
          emptyLabel={t("shared.none") ?? "Không có"}
        />
      </div>
    </div>
  );
}

function ActionGroup({
  title,
  items,
  tone,
  emptyLabel
}: {
  title: string;
  items: string[];
  tone: "emerald" | "rose";
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
      <div className="border-b border-slate-700/90 bg-slate-950/80 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-100">{title}</div>
      </div>
      <div className="p-4">
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                tone === "emerald"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200"
              }`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{emptyLabel}</span>
        )}
      </div>
      </div>
    </div>
  );
}
