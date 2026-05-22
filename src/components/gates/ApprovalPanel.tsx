 "use client";

import { StateBadge } from "@/components/shared/StateBadge";
import type { Approval } from "@/types/approval";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n/useI18n";

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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold text-white">{t("approvals.panel.title") ?? "Approval panel"}</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">{t("approvals.panel.description") ?? "Human authority only. Actions below are review controls, not automation triggers."}</p>
      </div>
      <div className="space-y-3">
        {approvals.map((approval) => (
          <div key={approval.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-medium text-white">
                  {approval.targetType} / {approval.targetId}
                </div>
                <div className="text-xs text-slate-400">
                  {t("approvals.panel.requestedBy") ?? "Requested by"} <span className="text-slate-200">{approval.requestedBy}</span> at{" "}
                  <span className="font-mono text-slate-300">{approval.requestedAt}</span>
                </div>
              </div>
              <StateBadge label={approval.status} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <ActionButton label={t("approvals.page.allowed.requestApproval") ?? "Request Approval"} />
              <ActionButton label={t("approvals.page.allowed.markReadyHumanReview") ?? "Mark Ready For Human Review"} />
              <ActionButton label={t("approvals.page.allowed.approveAsHuman") ?? "Approve as Human"} />
              <ActionButton label={t("approvals.page.allowed.reject") ?? "Reject"} tone="danger" />
              <ActionButton label={t("approvals.page.allowed.requestChanges") ?? "Request Changes"} tone="warning" />
            </div>
            <div className="mt-3 text-xs leading-5 text-slate-500">{t("approvals.panel.reviewOnly") ?? "Review-only controls. No publish, launch, or runtime orchestration is performed here."}</div>
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
  tone?: "neutral" | "danger" | "warning";
}) {
  const toneClass =
      tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-slate-700 bg-slate-900 text-slate-200";

  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-2 text-xs font-medium transition hover:border-slate-500 hover:bg-slate-800 ${toneClass}`}
    >
      {label}
    </button>
  );
}
