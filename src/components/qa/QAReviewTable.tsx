"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { QAReview } from "@/types/qa";
import { StateBadge } from "@/components/shared/StateBadge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export function QAReviewTable({ reviews }: { reviews: QAReview[] }) {
  const { t } = useI18n("qa");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-xl shadow-black/20">
      <div className="border-b border-slate-800/60 px-5 py-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-indigo-400" />
        <span className="text-sm font-semibold text-white">{t("qa.table.title") ?? "Đánh giá QA"}</span>
      </div>
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th className="px-5 py-3">{t("qa.table.artifact") ?? "Tài nguyên"}</th>
            <th className="px-5 py-3">{t("qa.table.reviewer") ?? "Người duyệt"}</th>
            <th className="px-5 py-3">{t("qa.table.status") ?? "Trạng thái"}</th>
            <th className="px-5 py-3">{t("qa.table.notes") ?? "Ghi chú"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {reviews.map((review) => {
            const isPhase1 = review.phase === 'phase1';
            const displayId = isPhase1 ? review.artifact_version_id : (review.artifact_version_id || review.content_item_id);
            const reviewerName = isPhase1 ? (review.reviewer_external_ref || review.reviewer_actor_type) : review.reviewer_ref;
            const subtitle = isPhase1 ? 'SSOT v1' : 'P2: ' + review.content_item_id;

            return (
              <tr key={review.id} className="text-slate-300 transition-colors hover:bg-slate-900/40 group">
                <td className="px-5 py-4">
                  <div className="font-medium text-white group-hover:text-indigo-300 transition-colors truncate max-w-[200px]" title={displayId}>{displayId}</div>
                  <div className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]" title={review.id}>{subtitle}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{reviewerName}</span>
                    {!isPhase1 && review.average_score != null && (
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                        Điểm: {review.average_score}/10
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StateBadge label={review.verdict} displayLabel={t(`qa.verdict.${review.verdict}`) ?? review.verdict} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-start gap-2">
                    {review.verdict === "BLOCKED" || review.verdict === "HOLD" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    ) : null}
                    <span className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">{review.notes || "-"}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

