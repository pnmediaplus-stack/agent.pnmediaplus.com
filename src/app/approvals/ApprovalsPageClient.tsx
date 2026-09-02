"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { ApprovalPanel } from "@/components/gates/ApprovalPanel";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Approval } from "@/types/approval";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ApprovalsPageClient() {
  const { t } = useI18n("approvals");
  const { data, error, isLoading } = useSWR<{ approvals: Approval[] }>("/api/approvals", fetcher);

  return (
    <PageFrame bannerKey="approvalspageclient_banner"
      title={t("approvals.page.title") ?? "Phê duyệt"}
      purpose={t("approvals.page.purpose") ?? "Bảng phê duyệt cho các yêu cầu đang chờ, quyết định rõ ràng và yêu cầu thay đổi."}
      statusLabel={t("approvals.page.statusLabel") ?? "Bảng điều khiển phê duyệt"}
      statusValue="PENDING"
      statusDisplayValue={t("approvals.state.PENDING") ?? "Đang chờ"}
      allowedActions={[
        t("approvals.page.allowed.requestApproval") ?? "Yêu cầu phê duyệt",
        t("approvals.page.allowed.approveAsHuman") ?? "Duyệt bởi Human",
        t("approvals.page.allowed.reject") ?? "Từ chối",
        t("approvals.page.allowed.requestChanges") ?? "Yêu cầu chỉnh sửa"
      ]}
      forbiddenActions={[
        t("approvals.page.forbidden.launchNow") ?? "Khởi chạy ngay",
        t("approvals.page.forbidden.autoPublish") ?? "Tự động xuất bản",
        t("approvals.page.forbidden.deployProduction") ?? "Triển khai Production"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-900 dark:text-white/50">Loading approvals...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load approvals</div>
        </div>
      ) : (
        <ApprovalPanel approvals={data?.approvals ?? []} />
      )}
    </PageFrame>
  );
}
