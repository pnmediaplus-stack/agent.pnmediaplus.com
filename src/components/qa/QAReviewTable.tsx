"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { QAReview } from "@/types/qa";
import { StateBadge } from "@/components/shared/StateBadge";

export function QAReviewTable({ reviews }: { reviews: QAReview[] }) {
  const { t } = useI18n("qa");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-5 py-4 text-sm font-semibold text-white">{t("qa.table.title") ?? "QA reviews"}</div>
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th className="px-5 py-3">{t("qa.table.artifact") ?? "Artifact"}</th>
            <th className="px-5 py-3">{t("qa.table.reviewer") ?? "Reviewer"}</th>
            <th className="px-5 py-3">{t("qa.table.status") ?? "Status"}</th>
            <th className="px-5 py-3">{t("qa.table.notes") ?? "Notes"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {reviews.map((review) => (
            <tr key={review.id} className="text-slate-300">
              <td className="px-5 py-4">{review.artifactId}</td>
              <td className="px-5 py-4">{review.reviewer}</td>
              <td className="px-5 py-4">
                <StateBadge label={review.status} />
              </td>
              <td className="px-5 py-4">{review.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
