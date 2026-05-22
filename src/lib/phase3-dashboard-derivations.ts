import type { Phase2DashboardData } from "@/types/phase2";
import type { Phase3DashboardData } from "@/types/phase3";

export function countPhase3ReadySurfaces(data: Phase3DashboardData) {
  return data.surfaces.filter((surface) => surface.state === "ready").length;
}

export function countPhase3BlockedSurfaces(data: Phase3DashboardData) {
  return data.surfaces.filter((surface) => surface.state === "blocked").length;
}

export function createPhase3BlockedData(): Phase3DashboardData {
  return {
    surfaces: [
      {
        id: "phase3_surface_ops_overview",
        titleKey: "phase3.surface.opsOverview.title",
        purposeKey: "phase3.surface.opsOverview.purpose",
        state: "blocked",
        owner: "Human"
      },
      {
        id: "phase3_surface_content_insights",
        titleKey: "phase3.surface.contentInsights.title",
        purposeKey: "phase3.surface.contentInsights.purpose",
        state: "pending",
        owner: "Content Ops"
      },
      {
        id: "phase3_surface_performance_review",
        titleKey: "phase3.surface.performanceReview.title",
        purposeKey: "phase3.surface.performanceReview.purpose",
        state: "pending",
        owner: "Performance Ops"
      }
    ],
    metrics: [
      {
        id: "phase3_metric_liveSources",
        labelKey: "phase3.metric.liveSources",
        value: "0",
        state: "blocked"
      },
      {
        id: "phase3_metric_writePaths",
        labelKey: "phase3.metric.writePaths",
        value: "0",
        state: "ready"
      },
      {
        id: "phase3_metric_runtimeChanges",
        labelKey: "phase3.metric.runtimeChanges",
        value: "0",
        state: "ready"
      }
    ]
  };
}

export function derivePhase3DashboardData(phase2: Phase2DashboardData): Phase3DashboardData {
  const contentItemsCount = phase2.contentItems.length;
  const performanceRecordsCount = phase2.performanceRecords.length;
  const qaReviewCount = phase2.qaReviews.length;
  const publishedCount = phase2.contentItems.filter((item) => item.currentState === "published").length;

  return {
    surfaces: [
      {
        id: "phase3_surface_ops_overview",
        titleKey: "phase3.surface.opsOverview.title",
        purposeKey: "phase3.surface.opsOverview.purpose",
        state: contentItemsCount > 0 ? "ready" : "pending",
        owner: "Phase 2 live baseline"
      },
      {
        id: "phase3_surface_content_insights",
        titleKey: "phase3.surface.contentInsights.title",
        purposeKey: "phase3.surface.contentInsights.purpose",
        state: contentItemsCount > 0 && qaReviewCount > 0 ? "ready" : "pending",
        owner: "Content Ops"
      },
      {
        id: "phase3_surface_performance_review",
        titleKey: "phase3.surface.performanceReview.title",
        purposeKey: "phase3.surface.performanceReview.purpose",
        state: performanceRecordsCount > 0 || publishedCount > 0 ? "ready" : "pending",
        owner: "Performance Ops"
      }
    ],
    metrics: [
      {
        id: "phase3_metric_liveSources",
        labelKey: "phase3.metric.liveSources",
        value: "5",
        state: "ready"
      },
      {
        id: "phase3_metric_writePaths",
        labelKey: "phase3.metric.writePaths",
        value: String(contentItemsCount),
        state: contentItemsCount > 0 ? "ready" : "pending"
      },
      {
        id: "phase3_metric_runtimeChanges",
        labelKey: "phase3.metric.runtimeChanges",
        value: String(publishedCount + performanceRecordsCount),
        state: "ready"
      }
    ]
  };
}
