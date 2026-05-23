"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { CustomerExecutionSurface } from "@/components/customer/CustomerExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function CustomerPage() {
  const { t } = useI18n("customer");

  return (
    <PageFrame
      title={t("customer.page.title") ?? "Customer execution"}
      purpose={t("customer.page.purpose") ?? "Read-only customer surface for intake, triage, escalation, feedback summary, and issue status."}
      statusLabel={t("customer.page.statusLabel") ?? "Customer surface"}
      statusValue="REVIEW"
      statusDisplayValue={t("customer.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("customer.page.allowed.inspectIntake") ?? "Inspect intake",
        t("customer.page.allowed.reviewEscalations") ?? "Review escalations",
        t("customer.page.allowed.traceFeedback") ?? "Trace feedback loop"
      ]}
      forbiddenActions={[
        t("customer.page.forbidden.editOffers") ?? "Edit offers",
        t("customer.page.forbidden.changePricing") ?? "Change pricing",
        t("customer.page.forbidden.selfResolve") ?? "Self-resolve truth"
      ]}
    >
      <CustomerExecutionSurface />
    </PageFrame>
  );
}
