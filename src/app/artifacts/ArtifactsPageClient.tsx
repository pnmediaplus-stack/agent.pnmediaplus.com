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
      title={t("artifacts.page.title") ?? "Artifacts"}
      purpose={t("artifacts.page.purpose") ?? "Artifact registry cho các tài liệu, prompt, asset, ghi chú quy trình và các trạng thái liên quan."}
      statusLabel={t("artifacts.page.statusLabel") ?? "Artifact registry"}
      statusValue="ACTIVE"
      statusDisplayValue={t("artifacts.state.ACTIVE") ?? "Hoạt động"}
      allowedActions={[
        t("artifacts.page.allowed.inspectVersion") ?? "Xem phiên bản",
        t("artifacts.page.allowed.markReadyReview") ?? "Đánh dấu sẵn sàng review",
        t("artifacts.page.allowed.viewOwnership") ?? "Xem quyền sở hữu"
      ]}
      forbiddenActions={[
        t("artifacts.page.forbidden.autoPublish") ?? "Tự động xuất bản",
        t("artifacts.page.forbidden.launchAsset") ?? "Khởi chạy asset",
        t("artifacts.page.forbidden.bypassQA") ?? "Bỏ qua QA"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">Loading artifacts...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load artifacts</div>
        </div>
      ) : (
        <ArtifactTable artifacts={data?.artifacts ?? []} />
      )}
    </PageFrame>
  );
}
