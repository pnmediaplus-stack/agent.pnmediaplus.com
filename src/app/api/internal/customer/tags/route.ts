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

    // Fallback for Langchain/n8n single-string tool bug
    let aiData: any = { ...payload };
    if (payload.query && typeof payload.query === "string") {
      try {
        // Try parsing query as JSON
        const parsed = JSON.parse(payload.query);
        aiData = { ...aiData, ...parsed };
      } catch (e) {
        // If not JSON, it's a raw string like "Tên: Bình, SĐT: 09..."
        // We will just let the payloadMap handle it if any keys magically match, or use regex
        const phoneMatch = payload.query.match(/(?:0|\+84)[0-9]{9,10}/);
        const emailMatch = payload.query.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        
        if (phoneMatch) aiData.phone_number = phoneMatch[0];
        if (emailMatch) aiData.email = emailMatch[0];
        
        // Extract a simple name (very rough fallback)
        const nameMatch = payload.query.match(/Tên:\s*([^,.\n]+)/i);
        if (nameMatch) aiData.full_name = nameMatch[1].trim();
      }
    }

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

    const tags = Array.isArray(aiData.tags)
      ? aiData.tags
      : typeof aiData.tags === "string" && aiData.tags.trim()
        ? [aiData.tags]
        : [];

    const normalizedTags = tags
      .map((tag: unknown) => String(tag).trim())
      .filter(Boolean);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (normalizedTags.length > 0) {
      updates.tags = normalizedTags;
    }

    // Map common LLM hallucinations to correct schema fields
    const payloadMap: Record<string, string> = {
      address: String(aiData.address || "").trim(),
      email: String(aiData.email || aiData.mail || "").trim(),
      notes: String(aiData.notes || aiData.note || "").trim(),
      full_name: String(aiData.full_name || aiData.name || aiData.ten || "").trim(),
      phone_number: String(aiData.phone_number || aiData.phone || aiData.sdt || "").trim(),
      primary_need: String(aiData.primary_need || aiData.demand || aiData.nhu_cau || "").trim(),
      customer_segment: String(aiData.customer_segment || aiData.segment || "").trim()
    };

    for (const key of ["address", "email", "notes", "full_name", "phone_number", "primary_need", "customer_segment"] as const) {
      if (payloadMap[key]) {
        updates[key] = payloadMap[key];
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
