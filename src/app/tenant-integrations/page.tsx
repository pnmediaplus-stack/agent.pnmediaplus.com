"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { TenantIntegrationsView } from "@/components/phase070/TenantIntegrationsView";
import { useI18n } from "@/lib/i18n/useI18n";

export default function TenantIntegrationsPage() {
  const { t } = useI18n("phase070");

  return (
    <PageFrame
      title={t("page.title") ?? "Tenant Integration Vault"}
      purpose={t("page.purpose") ?? "Phase 070 metadata shell for tenant integrations, write-only secret intake, and n8n-safe broker boundaries."}
      statusLabel={t("page.statusLabel") ?? "Vault boundary"}
      statusValue="BLOCKED"
      statusDisplayValue={t("page.statusValue") ?? "Writes blocked pending Gatekeeper encryption approval"}
      allowedActions={[
        t("page.allowed.viewProviders") ?? "View provider catalog",
        t("page.allowed.viewStatus") ?? "View tenant integration status",
        t("page.allowed.submitWriteOnly") ?? "Submit write-only secret placeholder"
      ]}
      forbiddenActions={[
        t("page.forbidden.readSecret") ?? "Read raw secrets",
        t("page.forbidden.n8nSecret") ?? "Send raw secrets to n8n",
        t("page.forbidden.publicRead") ?? "Expose secret data through public read surfaces",
        t("page.forbidden.selfActivate") ?? "Self-activate integrations"
      ]}
      contentClassName="grid gap-7"
    >
      <TenantIntegrationsView />
    </PageFrame>
  );
}
