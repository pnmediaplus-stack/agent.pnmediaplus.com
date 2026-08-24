import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase-server";

function requireInternalSecret(request: Request) {
  const expected = (process.env.CONTROL_PLANE_SECRET || "").trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  return expected && provided && expected === provided;
}

export async function POST(request: Request) {
  try {
    if (!requireInternalSecret(request)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const organizationId = String(payload.organization_id || "").trim();
    const threadId = String(payload.thread_id || "").trim();

    if (!organizationId || !threadId) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("crm_threads")
      .update({ status: "human_handling", updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("id", threadId);

    if (error) {
      return NextResponse.json({ error: "THREAD_HANDOFF_FAILED", message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      state: "ready",
      thread_id: threadId,
      organization_id: organizationId,
      status: "human_handling"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
