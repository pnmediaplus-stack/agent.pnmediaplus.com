import { NextResponse } from 'next/server';
import { z } from 'zod';

const PublishStatusSchema = z.object({
  action: z.literal("publish_status"),
  job_id: z.string(),
  post_id: z.string().optional(),
  status: z.string(),
  error_message: z.string().optional(),
  fb_id: z.string().optional()
});

const ChatAppendSchema = z.object({
  action: z.literal("chat_append"),
  thread_id: z.string(),
  organization_id: z.string(),
  idempotency_key: z.string(),
  sender: z.string().default("agent"),
  body: z.string(),
  intent_type: z.string().default("agent_response"),
  metadata: z.record(z.string(), z.any()).optional()
});

const BasePayloadSchema = z.object({
  action: z.string().optional()
}).passthrough();

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-n8n-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    
    // We parse action here to do Auth Lane Separation
    const rawPayload = await request.json().catch(() => ({}));
    const baseParse = BasePayloadSchema.safeParse(rawPayload);
    if (!baseParse.success) {
      return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
    }

    let action = baseParse.data.action;
    if (!action) {
      if (rawPayload.job_id && rawPayload.status) {
        action = "publish_status";
        rawPayload.action = "publish_status";
      } else {
        return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });
      }
    }

    // Auth Lane Separation (Gatekeeper Constraint #3)
    let validKey = process.env.N8N_API_KEY; // Default legacy key
    
    if (action === "chat_append") {
      // Require a dedicated lane key for agent responses
      const campaignKey = process.env.N8N_CAMPAIGN_PLANNER_API_KEY;
      if (!campaignKey) {
        return NextResponse.json({ error: 'N8N_CAMPAIGN_PLANNER_API_KEY is not configured on the server' }, { status: 500 });
      }
      validKey = campaignKey;
    }

    if (!validKey || authHeader !== validKey) {
      console.warn(`[N8N_CALLBACK] Auth Lane rejected for action: ${action}`);
      return NextResponse.json({ error: 'Unauthorized for this lane' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    if (action === "publish_status") {
      const parseResult = PublishStatusSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        return NextResponse.json({ ok: false, error: "Invalid publish_status payload", details: parseResult.error.format() }, { status: 400 });
      }

      const { job_id, status, error_message, fb_id } = parseResult.data;
      console.log(`[N8N_CALLBACK:PUBLISH] Nhận trạng thái từ n8n cho Job ${job_id}:`, status);

      const targetState = status.toLowerCase() === 'success' ? 'PUBLISHED' : 'FAILED';
      // const errorMessage = status.toLowerCase() !== 'success' ? (error_message || 'Unknown error during publish') : null;

      const res = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${job_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
          'Content-Profile': 'pn_os_ai_department'
        },
        body: JSON.stringify({ 
          state: targetState
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error('[N8N_CALLBACK:PUBLISH] Lỗi update DB:', errText);
        return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
      } else {
        console.log(`[N8N_CALLBACK:PUBLISH] Đã cập nhật task ${job_id} thành ${targetState}. FB_ID: ${fb_id || 'N/A'}`);
      }

      return NextResponse.json({ ok: true, received: true, action });

    } else if (action === "chat_append") {
      const parseResult = ChatAppendSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        return NextResponse.json({ ok: false, error: "Invalid chat_append payload", details: parseResult.error.format() }, { status: 400 });
      }
      const { thread_id, organization_id, idempotency_key, sender, body, intent_type, metadata } = parseResult.data;

      // 1. Verify thread ownership and organization active state
      const [threadRes, orgRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/chat_threads?id=eq.${thread_id}&select=departments!inner(organization_id)`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Accept-Profile': 'pn_os_ai_department'
          },
          cache: 'no-store'
        }),
        fetch(`${supabaseUrl}/rest/v1/portal_organizations?organization_id=eq.${organization_id}&select=status`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Accept-Profile': 'public'
          },
          cache: 'no-store'
        })
      ]);

      if (!threadRes.ok || !orgRes.ok) {
        return NextResponse.json({ ok: false, error: "Failed to verify thread or organization" }, { status: 500 });
      }

      const [threadData, orgData] = await Promise.all([threadRes.json(), orgRes.json()]);

      if (!threadData || threadData.length === 0 || threadData[0].departments?.organization_id !== organization_id) {
        console.warn(`[N8N_CALLBACK:CHAT] Thread ownership mismatch or not found for thread ${thread_id}`);
        return NextResponse.json({ ok: false, error: "Thread not found or ownership mismatch" }, { status: 403 });
      }

      if (!orgData || orgData.length === 0 || String(orgData[0].status).toUpperCase() !== 'ACTIVE') {
        console.warn(`[N8N_CALLBACK:CHAT] Organization ${organization_id} is not active or not found. Status: ${orgData?.[0]?.status}`);
        return NextResponse.json({ ok: false, error: "Organization is not active or not found" }, { status: 403 });
      }

      // 2. Insert new message (Append-only) with atomic Idempotency Key check
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
          'Content-Profile': 'pn_os_ai_department'
        },
        body: JSON.stringify({
          thread_id,
          idempotency_key,
          actor_type: sender,
          content: body,
          intent_type
        })
      });

      if (!insertRes.ok) {
        let errJson: any = null;
        try {
          errJson = await insertRes.json();
        } catch (e) {
          // fallback
        }
        
        // Handle atomic unique constraint violation (idempotency hit) exactly via structured JSON
        if (insertRes.status === 409 && errJson && errJson.code === '23505') {
          console.log(`[N8N_CALLBACK:CHAT] Idempotency key ${idempotency_key} đã tồn tại (Atomic Reject). Bỏ qua ghi trùng.`);
          return NextResponse.json({ ok: true, received: true, action, message: "Idempotency key already exists. Ignored." });
        }

        console.error('[N8N_CALLBACK:CHAT] Lỗi insert DB:', errJson || await insertRes.text().catch(()=>''));
        return NextResponse.json({ ok: false, error: "DB_INSERT_ERROR" }, { status: 500 });
      }

      console.log(`[N8N_CALLBACK:CHAT] Đã chèn tin nhắn mới vào thread ${thread_id}`);
      return NextResponse.json({ ok: true, received: true, action });

    } else {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }

  } catch (err: any) {
    console.error("[N8N_CALLBACK] Lỗi xử lý callback:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
