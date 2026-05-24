"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { Phase068ProductPortalView } from "@/components/phase068/Phase068ProductPortalView";
import { useI18n } from "@/lib/i18n/useI18n";

export default function Phase068PortalPage() {
  const { t } = useI18n("phase068");

  return (
    <PageFrame
      title={t("page.title") ?? "Phase 068 Product Portal"}
      purpose={t("page.purpose") ?? "Canonical Product Portal core for identity, tenant, packaging, and workspace scaffolds."}
      statusLabel={t("page.statusLabel") ?? "Portal core"}
      statusValue="REVIEW"
      statusDisplayValue={t("page.statusValue") ?? "Read-only scaffold"}
      allowedActions={[
        t("page.allowed.viewIdentity") ?? "View identity shell",
        t("page.allowed.viewTenant") ?? "View tenant shell",
        t("page.allowed.viewPackages") ?? "View package catalog",
        t("page.allowed.viewWorkspace") ?? "View workspace scaffold"
      ]}
      forbiddenActions={[
        t("page.forbidden.signup") ?? "Open public signup",
        t("page.forbidden.activate") ?? "Self-activate package",
        t("page.forbidden.wordpress") ?? "Depend on WordPress",
        t("page.forbidden.mutate") ?? "Mutate source of truth"
      ]}
      contentClassName="grid gap-7"
    >
      <Phase068ProductPortalView />
    </PageFrame>
  );
}
