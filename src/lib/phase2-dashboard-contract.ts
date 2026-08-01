import {
  PHASE2_PIPELINE_STATES,
  PHASE2_PERFORMANCE_METRIC_FIELDS,
  PHASE2_REQUIRED_ASSET_TYPES,
  type Phase2AgentTask,
  type Phase2Asset,
  type Phase2ContentItem,
  type Phase2PerformanceRecord,
  type Phase2QaReview,
  type Phase2PerformanceMetricField,
  type Phase2PipelineState
} from "@/types/phase2";

export { PHASE2_PIPELINE_STATES } from "@/types/phase2";
export { PHASE2_PERFORMANCE_METRIC_FIELDS } from "@/types/phase2";

export const PHASE2_PERFORMANCE_METRIC_COLUMNS = PHASE2_PERFORMANCE_METRIC_FIELDS.map((key) => ({
  key,
  label: key
})) as readonly { key: Phase2PerformanceMetricField; label: string }[];

const now = "2026-05-20T08:00:00.000Z";

export const phase2ContentItems: Phase2ContentItem[] = [
  {
    id: "ci_idea_001",
    contentKey: "spring_offer_idea_scan",
    title: "Spring offer angle scan",
    ownerRef: "PN MEDIA PLUS",
    currentState: "idea",
    taskOwnerRef: "content_research"
  },
  {
    id: "ci_research_001",
    contentKey: "spring_offer_research_ready",
    title: "Spring offer research packet",
    ownerRef: "PN MEDIA PLUS",
    currentState: "research_ready",
    taskOwnerRef: "viral_research"
  },
  {
    id: "ci_visual_001",
    contentKey: "spring_offer_visual_ready",
    title: "Spring offer visual draft",
    ownerRef: "PN MEDIA PLUS",
    currentState: "visual_ready",
    taskOwnerRef: "visual_production"
  },
  {
    id: "ci_caption_001",
    contentKey: "spring_offer_caption_ready",
    title: "Spring offer caption draft",
    ownerRef: "PN MEDIA PLUS",
    currentState: "caption_ready",
    taskOwnerRef: "caption_writer"
  },
  {
    id: "ci_qa_001",
    contentKey: "spring_offer_qa_ready",
    title: "Spring offer QA packet",
    ownerRef: "PN MEDIA PLUS",
    currentState: "QA_ready",
    taskOwnerRef: "qa_sentinel"
  },
  {
    id: "ci_passed_001",
    contentKey: "spring_offer_qa_passed",
    title: "Spring offer approved content",
    ownerRef: "PN MEDIA PLUS",
    currentState: "QA_passed",
    taskOwnerRef: "qa_sentinel"
  },
  {
    id: "ci_scheduled_001",
    contentKey: "spring_offer_scheduled",
    title: "Spring offer scheduled content",
    ownerRef: "PN MEDIA PLUS",
    currentState: "scheduled",
    taskOwnerRef: "publish_ops"
  },
  {
    id: "ci_published_001",
    contentKey: "spring_offer_published",
    title: "Spring offer published content",
    ownerRef: "PN MEDIA PLUS",
    currentState: "published",
    taskOwnerRef: "publish_ops"
  }
];

export const phase2AgentTasks: Phase2AgentTask[] = [
  {
    id: "task_ci_idea_001",
    contentItemId: "ci_idea_001",
    taskKey: "task_research_angle_scan",
    ownerRef: "content_research",
    taskKind: "research",
    state: "assigned",
    title: "Research the content angle",
    instructions: "Collect observations and identify usable market angle."
  },
  {
    id: "task_ci_research_001",
    contentItemId: "ci_research_001",
    taskKey: "task_prepare_viral_packet",
    ownerRef: "viral_research",
    taskKind: "research",
    state: "done",
    title: "Prepare viral research packet",
    resultRef: "asset://viral_research_packet/spring_offer_research_ready",
    completedAt: now
  },
  {
    id: "task_ci_visual_001",
    contentItemId: "ci_visual_001",
    taskKey: "task_prepare_visual_asset",
    ownerRef: "visual_production",
    taskKind: "visual",
    state: "done",
    title: "Prepare visual asset",
    resultRef: "asset://visual_asset/spring_offer_visual_ready",
    completedAt: now
  },
  {
    id: "task_ci_caption_001",
    contentItemId: "ci_caption_001",
    taskKey: "task_prepare_caption_output",
    ownerRef: "caption_writer",
    taskKind: "caption",
    state: "done",
    title: "Prepare caption output",
    resultRef: "asset://caption_output/spring_offer_caption_ready",
    completedAt: now
  },
  {
    id: "task_ci_qa_001",
    contentItemId: "ci_qa_001",
    taskKey: "task_review_qa_packet",
    ownerRef: "qa_sentinel",
    taskKind: "qa",
    state: "working",
    title: "Review QA packet",
    startedAt: now
  },
  {
    id: "task_ci_passed_001",
    contentItemId: "ci_passed_001",
    taskKey: "task_review_passed_content",
    ownerRef: "qa_sentinel",
    taskKind: "qa",
    state: "done",
    title: "Approve ready-for-schedule content",
    resultRef: "qa_review://spring_offer_qa_passed",
    completedAt: now
  },
  {
    id: "task_ci_scheduled_001",
    contentItemId: "ci_scheduled_001",
    taskKey: "task_schedule_publish",
    ownerRef: "publish_ops",
    taskKind: "publish_prep",
    state: "done",
    title: "Schedule publish window",
    resultRef: "workflow://content_schedule_ready",
    completedAt: now
  },
  {
    id: "task_ci_published_001",
    contentItemId: "ci_published_001",
    taskKey: "task_monitor_post_publish",
    ownerRef: "publish_ops",
    taskKind: "publish_prep",
    state: "done",
    title: "Monitor post-publish snapshot",
    resultRef: "metrics://post_publish_snapshot",
    completedAt: now
  }
];

export const phase2Assets: Phase2Asset[] = [
  {
    id: "asset_research_001",
    contentItemId: "ci_research_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer.json",
    mimeType: "application/json"
  },
  {
    id: "asset_research_visual_001",
    contentItemId: "ci_visual_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer_visual",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer_visual.json",
    mimeType: "application/json"
  },
  {
    id: "asset_visual_001",
    contentItemId: "ci_visual_001",
    agentTaskId: "task_ci_visual_001",
    assetKey: "visual_asset_spring_offer",
    ownerRef: "visual_production",
    assetType: "visual_asset",
    assetUri: "supabase://assets/visual_asset_spring_offer.png",
    mimeType: "image/png"
  },
  {
    id: "asset_caption_001",
    contentItemId: "ci_caption_001",
    agentTaskId: "task_ci_caption_001",
    assetKey: "caption_output_spring_offer",
    ownerRef: "caption_writer",
    assetType: "caption_output",
    assetUri: "supabase://assets/caption_output_spring_offer.md",
    mimeType: "text/markdown"
  },
  {
    id: "asset_qa_001",
    contentItemId: "ci_qa_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer_qa",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer_qa.json",
    mimeType: "application/json"
  },
  {
    id: "asset_qa_002",
    contentItemId: "ci_qa_001",
    agentTaskId: "task_ci_visual_001",
    assetKey: "visual_asset_spring_offer_qa",
    ownerRef: "visual_production",
    assetType: "visual_asset",
    assetUri: "supabase://assets/visual_asset_spring_offer_qa.png",
    mimeType: "image/png"
  },
  {
    id: "asset_qa_003",
    contentItemId: "ci_qa_001",
    agentTaskId: "task_ci_caption_001",
    assetKey: "caption_output_spring_offer_qa",
    ownerRef: "caption_writer",
    assetType: "caption_output",
    assetUri: "supabase://assets/caption_output_spring_offer_qa.md",
    mimeType: "text/markdown"
  },
  {
    id: "asset_passed_research_001",
    contentItemId: "ci_passed_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer_passed",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer_passed.json",
    mimeType: "application/json"
  },
  {
    id: "asset_passed_visual_001",
    contentItemId: "ci_passed_001",
    agentTaskId: "task_ci_visual_001",
    assetKey: "visual_asset_spring_offer_passed",
    ownerRef: "visual_production",
    assetType: "visual_asset",
    assetUri: "supabase://assets/visual_asset_spring_offer_passed.png",
    mimeType: "image/png"
  },
  {
    id: "asset_passed_caption_001",
    contentItemId: "ci_passed_001",
    agentTaskId: "task_ci_caption_001",
    assetKey: "caption_output_spring_offer_passed",
    ownerRef: "caption_writer",
    assetType: "caption_output",
    assetUri: "supabase://assets/caption_output_spring_offer_passed.md",
    mimeType: "text/markdown"
  },
  {
    id: "asset_scheduled_research_001",
    contentItemId: "ci_scheduled_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer_scheduled",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer_scheduled.json",
    mimeType: "application/json"
  },
  {
    id: "asset_scheduled_visual_001",
    contentItemId: "ci_scheduled_001",
    agentTaskId: "task_ci_visual_001",
    assetKey: "visual_asset_spring_offer_scheduled",
    ownerRef: "visual_production",
    assetType: "visual_asset",
    assetUri: "supabase://assets/visual_asset_spring_offer_scheduled.png",
    mimeType: "image/png"
  },
  {
    id: "asset_scheduled_caption_001",
    contentItemId: "ci_scheduled_001",
    agentTaskId: "task_ci_caption_001",
    assetKey: "caption_output_spring_offer_scheduled",
    ownerRef: "caption_writer",
    assetType: "caption_output",
    assetUri: "supabase://assets/caption_output_spring_offer_scheduled.md",
    mimeType: "text/markdown"
  },
  {
    id: "asset_published_research_001",
    contentItemId: "ci_published_001",
    agentTaskId: "task_ci_research_001",
    assetKey: "viral_research_packet_spring_offer_published",
    ownerRef: "viral_research",
    assetType: "viral_research_packet",
    assetUri: "supabase://assets/viral_research_packet_spring_offer_published.json",
    mimeType: "application/json"
  },
  {
    id: "asset_published_visual_001",
    contentItemId: "ci_published_001",
    agentTaskId: "task_ci_visual_001",
    assetKey: "visual_asset_spring_offer_published",
    ownerRef: "visual_production",
    assetType: "visual_asset",
    assetUri: "supabase://assets/visual_asset_spring_offer_published.png",
    mimeType: "image/png"
  },
  {
    id: "asset_published_caption_001",
    contentItemId: "ci_published_001",
    agentTaskId: "task_ci_caption_001",
    assetKey: "caption_output_spring_offer_published",
    ownerRef: "caption_writer",
    assetType: "caption_output",
    assetUri: "supabase://assets/caption_output_spring_offer_published.md",
    mimeType: "text/markdown"
  }
];

export const phase2QaReviews: Phase2QaReview[] = [
  {
    id: "qa_ci_qa_001",
    contentItemId: "ci_qa_001",
    agentTaskId: "task_ci_qa_001",
    reviewerRef: "qa_sentinel",
    verdict: "blocked",
    averageScore: 6.4,
    overclaimRisk: 4,
    missingAsset: false,
    evidenceRef: "qa://spring_offer_qa_ready_review",
    notes: "Ready for QA but not publishable yet.",
    reviewedAt: now
  },
  {
    id: "qa_ci_passed_001",
    contentItemId: "ci_passed_001",
    agentTaskId: "task_ci_passed_001",
    reviewerRef: "qa_sentinel",
    verdict: "pass",
    averageScore: 8.2,
    overclaimRisk: 2,
    missingAsset: false,
    evidenceRef: "qa://spring_offer_qa_passed_review",
    notes: "Meets QA gate and publish threshold.",
    reviewedAt: now
  },
  {
    id: "qa_ci_scheduled_001",
    contentItemId: "ci_scheduled_001",
    agentTaskId: "task_ci_scheduled_001",
    reviewerRef: "qa_sentinel",
    verdict: "pass",
    averageScore: 8.4,
    overclaimRisk: 2,
    missingAsset: false,
    evidenceRef: "qa://spring_offer_scheduled_review",
    notes: "Scheduled after QA pass.",
    reviewedAt: now
  },
  {
    id: "qa_ci_published_001",
    contentItemId: "ci_published_001",
    agentTaskId: "task_ci_published_001",
    reviewerRef: "qa_sentinel",
    verdict: "pass",
    averageScore: 8.7,
    overclaimRisk: 1,
    missingAsset: false,
    evidenceRef: "qa://spring_offer_published_review",
    notes: "Eligible and published after QA gate.",
    reviewedAt: now
  }
];

export const phase2PerformanceRecords: Phase2PerformanceRecord[] = [
  {
    id: "perf_ci_published_001_001",
    contentItemId: "ci_published_001",
    ownerRef: "publish_ops",
    sourceRef: "metrics://post_publish_snapshot",
    capturedAt: now,
    notes: "First post-publish snapshot",
    impressions: 12840,
    reach: 7800,
    views: 9321,
    likes: 420,
    comments: 38,
    shares: 17,
    saves: 92,
    clicks: 610,
    CTR: 4.76,
    watch_time: 3821,
    retention_rate: 68.4,
    completion_rate: 54.2,
    follower_growth: 128,
    performance_score: 82.7
  },
  {
    id: "perf_ci_published_001_002",
    contentItemId: "ci_published_001",
    ownerRef: "publish_ops",
    sourceRef: "metrics://post_publish_snapshot",
    capturedAt: "2026-05-20T09:00:00.000Z",
    notes: "Second post-publish snapshot",
    impressions: 14120,
    reach: 8610,
    views: 10144,
    likes: 468,
    comments: 41,
    shares: 21,
    saves: 107,
    clicks: 704,
    CTR: 4.99,
    watch_time: 4188,
    retention_rate: 70.1,
    completion_rate: 56.8,
    follower_growth: 139,
    performance_score: 84.1
  }
];

export function getPhase2NextState(state: Phase2PipelineState): Phase2PipelineState | "terminal" {
  const index = PHASE2_PIPELINE_STATES.indexOf(state);
  return index >= 0 && index < PHASE2_PIPELINE_STATES.length - 1
    ? PHASE2_PIPELINE_STATES[index + 1]
    : "terminal";
}

export function getPhase2RequiredAssets(contentItemId: string, phase2Assets: Phase2Asset[]) {
  const contentAssets = phase2Assets.filter((asset) => asset.contentItemId === contentItemId);
  const present = PHASE2_REQUIRED_ASSET_TYPES.filter((type) =>
    contentAssets.some((asset) => asset.assetType === type)
  );
  const missing = PHASE2_REQUIRED_ASSET_TYPES.filter((type) => !present.includes(type));

  return {
    totalRequired: PHASE2_REQUIRED_ASSET_TYPES.length,
    present,
    missing,
    complete: missing.length === 0
  };
}

export function aggregatePipelineStates(items: Phase2ContentItem[]) {
  const counts = Object.fromEntries(PHASE2_PIPELINE_STATES.map((state) => [state, 0])) as Record<Phase2PipelineState, number>;
  for (const item of items) {
    if (counts[item.currentState] !== undefined) {
      counts[item.currentState]++;
    }
  }
  return PHASE2_PIPELINE_STATES.map((state) => ({
    name: state,
    value: counts[state]
  }));
}

export function aggregatePerformanceData(records: Phase2PerformanceRecord[]) {
  // Sort records by capturedAt ascending to ensure chronological order
  const sorted = [...records].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  
  // Group by Date (YYYY-MM-DD)
  const grouped: Record<string, any> = {};
  for (const record of sorted) {
    const dateStr = record.capturedAt.split("T")[0];
    if (!grouped[dateStr]) {
      grouped[dateStr] = { date: dateStr, impressions: 0, views: 0, likes: 0, reach: 0 };
    }
    grouped[dateStr].impressions += Number(record.impressions || 0);
    grouped[dateStr].views += Number(record.views || 0);
    grouped[dateStr].likes += Number(record.likes || 0);
    grouped[dateStr].reach += Number(record.reach || 0);
  }

  // Convert to array
  return Object.values(grouped);
}

export function getPhase2LatestReview(contentItemId: string, phase2QaReviews: Phase2QaReview[]) {
  return [...phase2QaReviews]
    .filter((review) => review.contentItemId === contentItemId)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
}

export function getPhase2PublishEligibility(contentItemId: string, phase2QaReviews: Phase2QaReview[], phase2Assets: Phase2Asset[]) {
  const review = getPhase2LatestReview(contentItemId, phase2QaReviews);
  const assets = getPhase2RequiredAssets(contentItemId, phase2Assets);
  const ready =
    !!review &&
    review.verdict === "pass" &&
    review.averageScore >= 7 &&
    review.overclaimRisk <= 3 &&
    review.missingAsset === false &&
    assets.complete;

  return {
    ready,
    gateState: !review
      ? "PENDING"
      : ready
        ? "READY"
        : "BLOCKED",
    riskState: !review ? "PENDING" : review.overclaimRisk > 3 || review.averageScore < 7 ? "HIGH" : "LOW",
    review
  } as const;
}
