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
      purpose={t("qa.page.purpose") ?? "Bảng review QA với kết quả pass, hold, block cho governance nội bộ."}
      statusLabel={t("qa.page.statusLabel") ?? "QA review panel"}
      statusValue="REVIEW"
      statusDisplayValue={t("qa.state.REVIEW") ?? "Đang duyệt"}
      allowedActions={[
        t("qa.page.allowed.submitForQA") ?? "Gửi cho QA",
        t("qa.page.allowed.markReadyHumanReview") ?? "Đánh dấu sẵn sàng cho Human review",
        t("qa.page.allowed.requestChanges") ?? "Yêu cầu chỉnh sửa"
      ]}
      forbiddenActions={[
        t("qa.page.forbidden.approveWithoutReview") ?? "Duyệt khi chưa review",
        t("qa.page.forbidden.launchNow") ?? "Khởi chạy ngay",
        t("qa.page.forbidden.publishNow") ?? "Xuất bản ngay"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">{t("qa.loading") ?? "Đang tải dữ liệu QA..."}</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">{t("qa.error") ?? "Không thể tải dữ liệu QA"}</div>
        </div>
      ) : (
        <QAReviewTable reviews={data?.qa_reviews ?? []} />
      )}
    </PageFrame>
  );
}
