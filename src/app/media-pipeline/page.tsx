"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { MediaExecutionSurface } from "@/components/media/MediaExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function MediaPipelinePage() {
  const { t } = useI18n("media");

  return (
    <PageFrame
      title={t("media.page.title") ?? "Media execution"}
      purpose={t("media.page.purpose") ?? "Read-only media surface for asset production, prompt architecture, motion, caption packaging, and publish readiness."}
      statusLabel={t("media.page.statusLabel") ?? "Media surface"}
      statusValue="PARTIAL"
      statusDisplayValue={t("media.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("media.page.allowed.inspectProduction") ?? "Inspect production",
        t("media.page.allowed.reviewHandoffs") ?? "Review handoff from Marketing",
        t("media.page.allowed.previewQABoundary") ?? "Preview QA boundary"
      ]}
      forbiddenActions={[
        t("media.page.forbidden.autoPublish") ?? "Auto publish",
        t("media.page.forbidden.launchCampaign") ?? "Launch campaign",
        t("media.page.forbidden.editClaims") ?? "Edit claims"
      ]}
    >
      <MediaExecutionSurface />
    </PageFrame>
  );
}
