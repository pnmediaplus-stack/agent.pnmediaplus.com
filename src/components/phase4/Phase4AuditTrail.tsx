"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase4AuditEvent } from "@/types/phase4";

type Phase4AuditTrailProps = {
  events: Phase4AuditEvent[];
};

export function Phase4AuditTrail({ events }: Phase4AuditTrailProps) {
  const { t } = useI18n("phase4");

  if (!events.length) {
    return (
      <EmptyState
        title={t("phase4.audit.empty.title") ?? "No execution audit events"}
        description={t("phase4.audit.empty.description") ?? "Audit trail will render only after the read model is available."}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/70">
      <div className="border-b border-slate-700/80 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("phase4.audit.title") ?? "Execution audit trail"}</div>
      </div>
      <div className="divide-y divide-slate-800">
        {events.map((event) => (
          <div key={event.id} className="grid gap-2 px-5 py-4 text-sm text-slate-300 md:grid-cols-[11rem_1fr_12rem]">
            <div className="font-medium text-white">{event.eventType}</div>
            <div className="min-w-0 break-words">{event.summary}</div>
            <div className="text-xs text-slate-500">{event.createdAt}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
