import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { page, limit, since, ids } = body;
    
    if (typeof page !== 'number' || typeof limit !== 'number' || typeof since !== 'string' || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (page < 1 || limit <= 0) {
      return NextResponse.json({ error: "Boundary validation failed: page must be >= 1 and limit > 0" }, { status: 400 });
    }

    const headers = {
      "apikey": SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json"
    };

    // 1. Fetch current top IDs for page/limit to check for shifts
    const offset = (page - 1) * limit;
    const idsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/phase2_content_items?select=id&order=scheduled_at.asc.nullsfirst,updated_at.desc&offset=${offset}&limit=${limit}`,
      { headers }
    );
    
    if (!idsRes.ok) {
      throw new Error(`Failed to fetch current IDs: ${await idsRes.text()}`);
    }
    
    const currentItems = (await idsRes.json()) as { id: string }[];
    const currentIds = currentItems.map(item => item.id);
    
    // Check if the current IDs exactly match the client IDs (order matters!)
    const arraysMatch = currentIds.length === ids.length && currentIds.every((id, idx) => id === ids[idx]);
    
    if (!arraysMatch) {
      return NextResponse.json({ needsFullRefresh: true });
    }
    
    if (ids.length === 0) {
      return NextResponse.json({ needsFullRefresh: false, deltas: {} });
    }

    // Encode 'since' properly for PostgREST
    const encodedSince = encodeURIComponent(since);
    // Remove quotes around UUIDs! PostgREST `in.(a,b)` does not need quotes for UUIDs.
    const idsList = ids.join(",");
    
    const contentFilter = `id=in.(${idsList})&updated_at=gt.${encodedSince}`;
    const childFilter = `content_item_id=in.(${idsList})&updated_at=gt.${encodedSince}`;
    // lessons_learned view only has 'createdAt' (no updated_at), and we sync global new lessons.
    const lessonFilter = `createdAt=gt.${encodedSince}`;
    
    const [contentItemsRes, tasksRes, qaRes, assetsRes, perfRes, publishRes, lessonsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/phase2_content_items?${contentFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_agent_tasks?${childFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_qa_reviews?${childFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_assets?${childFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_performance_records?${childFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_publish_records?${childFilter}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/phase2_lessons_learned?${lessonFilter}`, { headers }),
    ]);

    // Error handling (Fail-closed)
    if (!contentItemsRes.ok || !tasksRes.ok || !qaRes.ok || !assetsRes.ok || !perfRes.ok || !publishRes.ok || !lessonsRes.ok) {
       return NextResponse.json({ error: "Failed to fetch delta data" }, { status: 500 });
    }

    const deltas = {
      contentItems: await contentItemsRes.json(),
      tasks: await tasksRes.json(),
      reviews: await qaRes.json(),
      assets: await assetsRes.json(),
      performance: await perfRes.json(),
      publishRecords: await publishRes.json(),
      lessons: await lessonsRes.json()
    };

    return NextResponse.json({ needsFullRefresh: false, deltas });

  } catch (err: any) {
    console.error("Delta Sync Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
