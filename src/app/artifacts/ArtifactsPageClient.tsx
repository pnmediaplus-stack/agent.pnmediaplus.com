"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { ArtifactTable } from "@/components/artifacts/ArtifactTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Artifact } from "@/types/artifact";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ArtifactsPageClient() {
  const { t } = useI18n("artifacts");
  const { data, error, isLoading } = useSWR<{ artifacts: Artifact[] }>("/api/artifacts", fetcher);

  return (
    <PageFrame
      title={t("artifacts.page.title") ?? "Tài nguyên"}
      purpose={t("artifacts.page.purpose") ?? "Kho lưu trữ tài nguyên cho các bản brief, prompt, tài sản, ghi chú quy trình và các trạng thái liên quan."}
      statusLabel={t("artifacts.page.statusLabel") ?? "Kho lưu trữ tài nguyên"}
      statusValue="ACTIVE"
      statusDisplayValue={t("artifacts.state.ACTIVE") ?? "Hoạt động"}
      allowedActions={[
        t("artifacts.page.allowed.inspectVersion") ?? "Xem phiên bản",
        t("artifacts.page.allowed.markReadyReview") ?? "Đánh dấu sẵn sàng đánh giá",
        t("artifacts.page.allowed.viewOwnership") ?? "Xem quyền sở hữu"
      ]}
      forbiddenActions={[
        t("artifacts.page.forbidden.autoPublish") ?? "Tự động xuất bản",
        t("artifacts.page.forbidden.launchAsset") ?? "Khởi chạy tài nguyên",
        t("artifacts.page.forbidden.bypassQA") ?? "Bỏ qua QA"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-900 dark:text-white/50">Đang tải tài nguyên...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Lỗi khi tải tài nguyên</div>
        </div>
      ) : (
        <ArtifactTable artifacts={data?.artifacts ?? []} />
      )}
    </PageFrame>
  );
}
