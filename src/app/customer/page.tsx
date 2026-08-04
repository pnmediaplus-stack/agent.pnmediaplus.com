"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { CustomerExecutionSurface } from "@/components/customer/CustomerExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function CustomerPage() {
  const { t } = useI18n("customer");

  return (
    <PageFrame
      title={t("customer.page.title") ?? "Vận hành Customer"}
      purpose={t("customer.page.purpose") ?? "Surface Customer chỉ đọc cho intake, triage, escalation, feedback summary và issue status."}
      statusLabel={t("customer.page.statusLabel") ?? "Bề mặt Customer"}
      statusValue="REVIEW"
      statusDisplayValue={t("customer.page.statusValue") ?? "Chỉ đọc"}
      allowedActions={[
        t("customer.page.allowed.inspectIntake") ?? "Xem intake",
        t("customer.page.allowed.reviewEscalations") ?? "Xem escalation",
        t("customer.page.allowed.traceFeedback") ?? "Theo dõi vòng phản hồi"
      ]}
      forbiddenActions={[
        t("customer.page.forbidden.editOffers") ?? "Sửa offer",
        t("customer.page.forbidden.changePricing") ?? "Đổi pricing",
        t("customer.page.forbidden.selfResolve") ?? "Tự giải truth"
      ]}
    >
      <CustomerExecutionSurface />
    </PageFrame>
  );
}
