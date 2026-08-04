"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { GateCard } from "@/components/gates/GateCard";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Gate } from "@/types/gate";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function GatesPageClient() {
  const { t } = useI18n("gates");
  const { data, error, isLoading } = useSWR<{ gates: Gate[] }>("/api/gates", fetcher);

  return (
    <PageFrame
      title={t("gates.page.title") ?? "Cổng"}
      purpose={t("gates.page.purpose") ?? "Gate và approval console cho quyền Human rõ ràng và bảo vệ state."}
      statusLabel={t("gates.page.statusLabel") ?? "Gate console"}
      statusValue="REVIEW_REQUIRED"
      statusDisplayValue={t("gates.state.REVIEW_REQUIRED") ?? "Cần phê duyệt"}
      allowedActions={[
        t("gates.page.allowed.requestApproval") ?? "Yêu cầu phê duyệt",
        t("gates.page.allowed.markReadyHumanReview") ?? "Đánh dấu sẵn sàng để Human review",
        t("gates.page.allowed.reject") ?? "Từ chối"
      ]}
      forbiddenActions={[
        t("gates.page.forbidden.approveAutomatically") ?? "Tự động phê duyệt",
        t("gates.page.forbidden.launchNow") ?? "Launch now",
        t("gates.page.forbidden.deployProduction") ?? "Deploy production"
      ]}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">{t("gates.loading") ?? "Đang tải dữ liệu cổng..."}</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">{t("gates.error") ?? "Không thể tải dữ liệu cổng"}</div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(data?.gates ?? []).map((gate) => (
            <GateCard key={gate.id} gate={gate} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
