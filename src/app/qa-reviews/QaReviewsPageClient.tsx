"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { QAReviewTable } from "@/components/qa/QAReviewTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { QAReview } from "@/types/qa";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function QaReviewsPageClient() {
  const { t } = useI18n("qa");
  const { data, error, isLoading } = useSWR<{ qa_reviews: QAReview[] }>("/api/qa-reviews", fetcher);

  return (
    <PageFrame
      title={t("qa.page.title") ?? "QA Reviews"}
      purpose={t("qa.page.purpose") ?? "QA review panel with pass, hold, and block outcomes for internal governance."}
      statusLabel={t("qa.page.statusLabel") ?? "QA review panel"}
      statusValue="REVIEW"
      allowedActions={[
        t("qa.page.allowed.submitForQA") ?? "Submit for QA",
        t("qa.page.allowed.markReadyHumanReview") ?? "Mark ready for human review",
        t("qa.page.allowed.requestChanges") ?? "Request changes"
      ]}
      forbiddenActions={[
        t("qa.page.forbidden.approveWithoutReview") ?? "Approve without review",
        t("qa.page.forbidden.launchNow") ?? "Launch now",
        t("qa.page.forbidden.publishNow") ?? "Publish now"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">Loading QA reviews...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load QA reviews</div>
        </div>
      ) : (
        <QAReviewTable reviews={data?.qa_reviews ?? []} />
      )}
    </PageFrame>
  );
}
