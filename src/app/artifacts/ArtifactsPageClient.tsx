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
    <PageFrame bannerKey="artifactspageclient_banner"
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
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mb-4"></div>
          <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Đang tải tài nguyên...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-red-200/50 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div className="text-sm font-bold text-red-600 dark:text-red-400">Lỗi khi tải tài nguyên</div>
          <div className="mt-1 text-[13px] text-red-500/80 dark:text-red-400/80">Vui lòng thử lại sau.</div>
        </div>
      ) : (
        <ArtifactTable artifacts={data?.artifacts ?? []} />
      )}
    </PageFrame>
  );
}
