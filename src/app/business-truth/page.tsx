"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { BusinessTruthExecutionSurface } from "@/components/business-truth/BusinessTruthExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function BusinessTruthPage() {
  const { t } = useI18n("businessTruth");

  return (
    <PageFrame bannerKey="page_banner"
      title={t("businessTruth.page.title") ?? "Vận hành Business Truth"}
      purpose={t("businessTruth.page.purpose") ?? "Surface Business Truth chỉ đọc cho billing, auth, identity, offer và package truth."}
      statusLabel={t("businessTruth.page.statusLabel") ?? "Bề mặt Business Truth"}
      statusValue="APPROVED"
      statusDisplayValue={t("businessTruth.page.statusValue") ?? "Chỉ đọc"}
      allowedActions={[
        t("businessTruth.page.allowed.inspectTruth") ?? "Xem truth",
        t("businessTruth.page.allowed.reviewHandoffs") ?? "Xem handoff từ Customer",
        t("businessTruth.page.allowed.previewCoreGovernance") ?? "Xem boundary Core Governance"
      ]}
      forbiddenActions={[
        t("businessTruth.page.forbidden.editBilling") ?? "Sửa billing",
        t("businessTruth.page.forbidden.editIdentity") ?? "Sửa identity",
        t("businessTruth.page.forbidden.selfMutate") ?? "Tự mutation truth"
      ]}
    >
      <BusinessTruthExecutionSurface />
    </PageFrame>
  );
}
