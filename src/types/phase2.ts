export const PHASE2_PIPELINE_STATES = [
  "idea",
  "research_ready",
  "visual_ready",
  "caption_ready",
  "QA_ready",
  "QA_passed",
  "scheduled",
  "published"
] as const;

export type Phase2PipelineState = (typeof PHASE2_PIPELINE_STATES)[number];

export const PHASE2_REQUIRED_ASSET_TYPES = [
  "viral_research_packet",
  "visual_asset",
  "caption_output"
] as const;

export type Phase2AssetType = (typeof PHASE2_REQUIRED_ASSET_TYPES)[number];

export type Phase2TaskState = "queued" | "assigned" | "working" | "blocked" | "done" | "cancelled";
export type Phase2QaVerdict = "pass" | "pass_with_conditions" | "hold" | "blocked" | "reject" | "needs_patch" | "ready_for_recheck";

export type Phase2ContentItem = {
  id: string;
  contentKey: string;
  title: string;
  ownerRef: string;
  currentState: Phase2PipelineState;
  taskOwnerRef: string;
  brief?: string;
};

export type Phase2AgentTask = {
  id: string;
  contentItemId: string;
  taskKey: string;
  ownerRef: string;
  taskKind: "research" | "visual" | "caption" | "qa" | "publish_prep";
  state: Phase2TaskState;
  title: string;
  instructions?: string;
  resultRef?: string;
  startedAt?: string;
  completedAt?: string;
};

export type Phase2Asset = {
  id: string;
  contentItemId: string;
  agentTaskId?: string;
  assetKey: string;
  ownerRef: string;
  assetType: Phase2AssetType;
  assetUri: string;
  mimeType?: string;
  contentHash?: string;
  evidenceRef?: string;
};

export type Phase2QaReview = {
  id: string;
  contentItemId: string;
  agentTaskId?: string;
  reviewerRef: string;
  verdict: Phase2QaVerdict;
  averageScore: number;
  overclaimRisk: number;
  missingAsset: boolean;
  evidenceRef: string;
  notes?: string;
  reviewedAt: string;
};

export const PHASE2_PERFORMANCE_METRIC_FIELDS = [
  "impressions",
  "reach",
  "views",
  "likes",
  "comments",
  "shares",
  "saves",
  "clicks",
  "CTR",
  "watch_time",
  "retention_rate",
  "completion_rate",
  "follower_growth",
  "performance_score"
] as const;

export type Phase2PerformanceMetricField = (typeof PHASE2_PERFORMANCE_METRIC_FIELDS)[number];

export type Phase2PerformanceRecord = {
  id: string;
  contentItemId: string;
  assetId?: string;
  ownerRef: string;
  sourceRef: string;
  capturedAt: string;
  notes?: string;
} & Partial<Record<Phase2PerformanceMetricField, number>>;

export type Phase2PublishRecord = {
  id: string;
  contentItemId: string;
  assetId?: string;
  channel: string;
  externalId?: string;
  externalUrl?: string;
  status: string;
  publishedAt?: string;
  errorMessage?: string;
};

export type Phase2LessonLearned = {
  id: string;
  contentItemId: string;
  lessonText: string;
  metricHighlight: string;
  createdAt: string;
};

export type Phase2DashboardData = {
  contentItems: Phase2ContentItem[];
  agentTasks: Phase2AgentTask[];
  assets: Phase2Asset[];
  qaReviews: Phase2QaReview[];
  publishRecords: Phase2PublishRecord[];
  performanceRecords: Phase2PerformanceRecord[];
  lessonsLearned: Phase2LessonLearned[];
};

export type Phase2DashboardLoadState = "ready" | "blocked";

export type Phase2DashboardLoadResult = {
  state: Phase2DashboardLoadState;
  data: Phase2DashboardData;
  reason?: string;
};
