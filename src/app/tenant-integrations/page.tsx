"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { TenantIntegrationsView } from "@/components/phase070/TenantIntegrationsView";
import { useI18n } from "@/lib/i18n/useI18n";

export default function TenantIntegrationsPage() {
  const { t } = useI18n("phase070");

  return (
    <PageFrame
      title={t("phase070.page.title") ?? "Tenant Integration Vault"}
      purpose={t("phase070.page.purpose") ?? "Phase 070 metadata shell for tenant integrations, write-only secret intake, and n8n-safe broker boundaries."}
      statusLabel={t("phase070.page.statusLabel") ?? "Vault boundary"}
      statusValue="SECURE"
      statusDisplayValue={t("phase070.page.statusValue") ?? "BẢO MẬT KÉP - Hệ thống SSOT đang hoạt động"}
      allowedActions={[
        t("phase070.page.allowed.viewProviders") ?? "View provider catalog",
        t("phase070.page.allowed.viewStatus") ?? "View tenant integration status",
        t("phase070.page.allowed.submitWriteOnly") ?? "Submit write-only secret placeholder"
      ]}
      forbiddenActions={[
        t("phase070.page.forbidden.readSecret") ?? "Read raw secrets",
        t("phase070.page.forbidden.n8nSecret") ?? "Send raw secrets to n8n",
        t("phase070.page.forbidden.publicRead") ?? "Expose secret data through public read surfaces",
        t("phase070.page.forbidden.selfActivate") ?? "Self-activate integrations"
      ]}
      contentClassName="grid gap-7"
    >
      <TenantIntegrationsView />
    </PageFrame>
  );
}
