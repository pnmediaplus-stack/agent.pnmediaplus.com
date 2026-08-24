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
    const customerId = String(payload.customer_id || "").trim();
    const threadId = String(payload.thread_id || "").trim();

    if (!organizationId) {
      return NextResponse.json({ error: "MISSING_ORGANIZATION_ID" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && threadId) {
      const { data: threadRow, error: threadError } = await supabase
        .from("crm_threads")
        .select("customer_id")
        .eq("organization_id", organizationId)
        .eq("id", threadId)
        .maybeSingle();

      if (threadError) {
        return NextResponse.json({ error: "THREAD_LOOKUP_FAILED", message: threadError.message }, { status: 500 });
      }

      resolvedCustomerId = String(threadRow?.customer_id || "").trim();
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ error: "MISSING_CUSTOMER_ID" }, { status: 400 });
    }

    const tags = Array.isArray(payload.tags)
      ? payload.tags
      : typeof payload.tags === "string" && payload.tags.trim()
        ? [payload.tags]
        : [];

    const normalizedTags = tags
      .map((tag: unknown) => String(tag).trim())
      .filter(Boolean);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (normalizedTags.length > 0) {
      updates.tags = normalizedTags;
    }

    for (const key of ["address", "email", "notes", "full_name", "phone_number", "primary_need", "customer_segment"] as const) {
      if (typeof payload[key] === "string" && String(payload[key]).trim()) {
        updates[key] = String(payload[key]).trim();
      }
    }

    const { data, error } = await supabase
      .from("crm_customers")
      .update(updates)
      .eq("organization_id", organizationId)
      .eq("id", resolvedCustomerId)
      .select("id, organization_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "CUSTOMER_UPDATE_FAILED", message: error.message }, { status: 500 });
    }

    if (threadId && normalizedTags.length > 0) {
      const { error: threadUpdateError } = await supabase
        .from("crm_threads")
        .update({
          tags: normalizedTags,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", organizationId)
        .eq("id", threadId);

      if (threadUpdateError) {
        return NextResponse.json({
          error: "THREAD_TAG_UPDATE_FAILED",
          message: threadUpdateError.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      state: "ready",
      customer_id: data?.id ?? resolvedCustomerId,
      organization_id: organizationId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
