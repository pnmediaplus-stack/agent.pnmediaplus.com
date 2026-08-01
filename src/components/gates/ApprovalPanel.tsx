 "use client";

import { StateBadge } from "@/components/shared/StateBadge";
import type { Approval } from "@/types/approval";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n/useI18n";
import { KeyRound, ShieldAlert } from "lucide-react";

export function ApprovalPanel({ approvals }: { approvals: Approval[] }) {
  const { t } = useI18n("approvals");
  if (!approvals.length) {
    return (
      <EmptyState
        title={t("approvals.panel.title") ?? "Approval panel"}
        description={t("approvals.panel.description") ?? "Approval requests will appear here when tasks or artifacts move into human review."}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-xl shadow-xl shadow-black/20">
      <div className="mb-6 flex items-center gap-3 border-b border-slate-800/60 pb-4">
        <KeyRound className="h-6 w-6 text-emerald-400" />
        <div>
          <div className="text-base font-semibold text-white">{t("approvals.panel.title") ?? "Approval panel"}</div>
          <p className="mt-1 text-xs text-slate-400">{t("approvals.panel.description") ?? "Human authority only. Actions below are review controls, not automation triggers."}</p>
        </div>
      </div>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <div key={approval.id} className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-5 shadow-lg transition-colors hover:border-slate-700/50 hover:bg-slate-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-slate-300 border border-slate-700/50">
                    {approval.targetType}
                  </span>
                  <span className="font-mono text-sm text-white group-hover:text-emerald-300 transition-colors">{approval.targetId}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {t("approvals.panel.requestedBy") ?? "Requested by"} <span className="font-medium text-slate-200">{approval.requestedBy}</span> at{" "}
                  <span className="font-mono text-slate-300">{new Date(approval.requestedAt).toLocaleString()}</span>
                </div>
              </div>
              <StateBadge label={approval.status} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ActionButton label={t("approvals.page.allowed.requestApproval") ?? "Request Approval"} />
              <ActionButton label={t("approvals.page.allowed.markReadyHumanReview") ?? "Mark Ready For Human Review"} />
              <ActionButton label={t("approvals.page.allowed.approveAsHuman") ?? "Approve as Human"} tone="primary" />
              <ActionButton label={t("approvals.page.allowed.reject") ?? "Reject"} tone="danger" />
              <ActionButton label={t("approvals.page.allowed.requestChanges") ?? "Request Changes"} tone="warning" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-slate-500 uppercase tracking-widest">
              <ShieldAlert className="h-3.5 w-3.5" />
              {t("approvals.panel.reviewOnly") ?? "Review-only controls. No publish, launch, or runtime orchestration is performed here."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "primary" | "danger" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
      : tone === "danger"
      ? "border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
      : tone === "warning"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
        : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800";

  return (
    <button
      type="button"
      className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${toneClass}`}
    >
      {label}
    </button>
  );
}
