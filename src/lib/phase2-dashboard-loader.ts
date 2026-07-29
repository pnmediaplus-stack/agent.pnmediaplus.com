import "server-only";

import type {
  Phase2AgentTask,
  Phase2Asset,
  Phase2ContentItem,
  Phase2DashboardData,
  Phase2DashboardLoadResult,
  Phase2PerformanceRecord,
  Phase2QaReview,
  Phase2PipelineState,
  Phase2PerformanceMetricField
} from "@/types/phase2";

const PHASE2_SCHEMA = "public";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type SupabaseTableResult<T> = {
  data: T[];
  error?: string;
};

type ContentItemRow = {
  id: string;
  content_key: string;
  owner_ref: string;
  title: string;
  brief: string | null;
  state: Phase2PipelineState;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type AgentTaskRow = {
  id: string;
  content_item_id: string;
  task_key: string;
  owner_ref: string;
  task_kind: Phase2AgentTask["taskKind"];
  state: Phase2AgentTask["state"];
  title: string;
  instructions: string | null;
  result_ref: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  content_item_id: string;
  agent_task_id: string | null;
  asset_key: string;
  owner_ref: string;
  asset_type: Phase2Asset["assetType"];
  asset_uri: string;
  mime_type: string | null;
  content_hash: string | null;
  evidence_ref: string | null;
  created_at: string;
  updated_at: string;
};

type QaReviewRow = {
  id: string;
  content_item_id: string;
  agent_task_id: string | null;
  reviewer_ref: string;
  verdict: Phase2QaReview["verdict"];
  average_score: number | string;
  overclaim_risk: number | string;
  missing_asset: boolean;
  evidence_ref: string;
  notes: string | null;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
};

type PerformanceRecordRow = {
  id: string;
  content_item_id: string;
  asset_id: string | null;
  owner_ref: string;
  impressions: number | string | null;
  reach: number | string | null;
  views: number | string | null;
  likes: number | string | null;
  comments: number | string | null;
  shares: number | string | null;
  saves: number | string | null;
  clicks: number | string | null;
  CTR: number | string | null;
  watch_time: number | string | null;
  retention_rate: number | string | null;
  completion_rate: number | string | null;
  follower_growth: number | string | null;
  performance_score: number | string | null;
  source_ref: string;
  captured_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function toNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

async function fetchPhase2Table<T>(table: string, select: string, orderBy: string): Promise<SupabaseTableResult<T>> {
  const config = getSupabaseConfig();

  if (!config) {
    return { data: [], error: "SUPABASE_ENV_MISSING" };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`);
    endpoint.searchParams.set("select", select);
    endpoint.searchParams.set("order", orderBy);

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        "Accept-Profile": PHASE2_SCHEMA,
        "Content-Profile": PHASE2_SCHEMA
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        data: [],
        error: `Supabase ${table} query failed (${response.status}): ${body || response.statusText}`
      };
    }

    const payload = (await response.json()) as T[];
    return { data: payload };
  } catch (error) {
    return {
      data: [],
      error: `Supabase ${table} fetch failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

type LessonLearnedRow = {
  id: string;
  contentItemId: string;
  lessonText: string;
  metricHighlight: string;
  createdAt: string;
};

export async function loadPhase2DashboardData(): Promise<Phase2DashboardLoadResult> {
  const [
    contentItemsResult,
    tasksResult,
    assetsResult,
    reviewsResult,
    performanceResult,
    lessonsResult
  ] = await Promise.all([
    fetchPhase2Table<ContentItemRow>(
      "phase2_content_items",
      "id,content_key,owner_ref,title,brief,state,scheduled_at,published_at,created_at,updated_at",
      "created_at.asc"
    ),
    fetchPhase2Table<AgentTaskRow>(
      "phase2_agent_tasks",
      "id,content_item_id,task_key,owner_ref,task_kind,state,title,instructions,result_ref,started_at,completed_at,created_at,updated_at",
      "created_at.asc"
    ),
    fetchPhase2Table<AssetRow>(
      "phase2_assets",
      "id,content_item_id,agent_task_id,asset_key,owner_ref,asset_type,asset_uri,mime_type,content_hash,evidence_ref,created_at,updated_at",
      "created_at.asc"
    ),
    fetchPhase2Table<QaReviewRow>(
      "phase2_qa_reviews",
      "id,content_item_id,agent_task_id,reviewer_ref,verdict,average_score,overclaim_risk,missing_asset,evidence_ref,notes,reviewed_at,created_at,updated_at",
      "reviewed_at.asc"
    ),
    fetchPhase2Table<PerformanceRecordRow>(
      "phase2_performance_records",
      "id,content_item_id,asset_id,owner_ref,impressions,reach,views,likes,comments,shares,saves,clicks,CTR,watch_time,retention_rate,completion_rate,follower_growth,performance_score,source_ref,captured_at,notes,created_at,updated_at",
      "captured_at.asc"
    ),
    fetchPhase2Table<LessonLearnedRow>(
      "phase2_lessons_learned",
      "id,contentItemId,lessonText,metricHighlight,createdAt",
      "createdAt.desc"
    )
  ]);

  const errors = [
    contentItemsResult.error,
    tasksResult.error,
    assetsResult.error,
    reviewsResult.error,
    performanceResult.error,
    lessonsResult.error
  ].filter(Boolean) as string[];

  if (errors.length) {
    return {
      state: "blocked",
      reason: errors[0],
      data: {
        contentItems: [],
        agentTasks: [],
        assets: [],
        qaReviews: [],
        performanceRecords: [],
        lessonsLearned: []
      }
    };
  }

  const contentItems: Phase2ContentItem[] = contentItemsResult.data.map((row) => {
    const ownedTaskRows = tasksResult.data.filter((task) => task.content_item_id === row.id);
    return {
      id: row.id,
      contentKey: row.content_key,
      title: row.title,
      ownerRef: row.owner_ref,
      currentState: row.state,
      brief: row.brief ?? undefined,
      taskOwnerRef: ownedTaskRows.length ? ownedTaskRows[ownedTaskRows.length - 1].owner_ref : "pending / incomplete"
    };
  });

  const agentTasks: Phase2AgentTask[] = tasksResult.data.map((row) => ({
    id: row.id,
    contentItemId: row.content_item_id,
    taskKey: row.task_key,
    ownerRef: row.owner_ref,
    taskKind: row.task_kind,
    state: row.state,
    title: row.title,
    instructions: row.instructions ?? undefined,
    resultRef: row.result_ref ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  }));

  const assets: Phase2Asset[] = assetsResult.data.map((row) => ({
    id: row.id,
    contentItemId: row.content_item_id,
    agentTaskId: row.agent_task_id ?? undefined,
    assetKey: row.asset_key,
    ownerRef: row.owner_ref,
    assetType: row.asset_type,
    assetUri: row.asset_uri,
    mimeType: row.mime_type ?? undefined,
    contentHash: row.content_hash ?? undefined,
    evidenceRef: row.evidence_ref ?? undefined
  }));

  const qaReviews: Phase2QaReview[] = reviewsResult.data.map((row) => ({
    id: row.id,
    contentItemId: row.content_item_id,
    agentTaskId: row.agent_task_id ?? undefined,
    reviewerRef: row.reviewer_ref,
    verdict: row.verdict,
    averageScore: toNumeric(row.average_score) ?? 0,
    overclaimRisk: toNumeric(row.overclaim_risk) ?? 0,
    missingAsset: row.missing_asset,
    evidenceRef: row.evidence_ref,
    notes: row.notes ?? undefined,
    reviewedAt: row.reviewed_at
  }));

  const metricFields: Phase2PerformanceMetricField[] = [
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
  ];

  const performanceRecords: Phase2PerformanceRecord[] = performanceResult.data.map((row) => {
    const record: Phase2PerformanceRecord = {
      id: row.id,
      contentItemId: row.content_item_id,
      assetId: row.asset_id ?? undefined,
      ownerRef: row.owner_ref,
      sourceRef: row.source_ref,
      capturedAt: row.captured_at,
      notes: row.notes ?? undefined
    };

    for (const metric of metricFields) {
      const value = toNumeric(row[metric]);
      if (typeof value === "number") {
        record[metric] = value;
      }
    }

    return record;
  });

  return {
    state: "ready",
    data: {
      contentItems,
      agentTasks,
      assets,
      qaReviews,
      performanceRecords
    }
  };
}
