"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { MarketingExecutionSurface } from "@/components/marketing/MarketingExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function MarketingPage() {
  const { t } = useI18n("marketing");

  return (
    <PageFrame bannerKey="page_banner"
      title={t("marketing.page.title") ?? "Marketing execution"}
      purpose={t("marketing.page.purpose") ?? "Read-only marketing surface for positioning, GTM framing, claim boundary, and handoff to Media."}
      statusLabel={t("marketing.page.statusLabel") ?? "Marketing surface"}
      statusValue="PARTIAL"
      statusDisplayValue={t("marketing.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("marketing.page.allowed.inspectPositioning") ?? "Inspect positioning",
        t("marketing.page.allowed.reviewBrief") ?? "Review brief",
        t("marketing.page.allowed.traceHandoff") ?? "Trace handoff to Media"
      ]}
      forbiddenActions={[
        t("marketing.page.forbidden.editBrief") ?? "Edit brief",
        t("marketing.page.forbidden.selfLaunch") ?? "Self-launch",
        t("marketing.page.forbidden.bypassBoundary") ?? "Bypass claim boundary"
      ]}
    >
      <MarketingExecutionSurface />
    </PageFrame>
  );
}
