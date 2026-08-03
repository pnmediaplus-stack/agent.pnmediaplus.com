export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-n8n-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const validKey = process.env.N8N_API_KEY;
    if (validKey && authHeader !== validKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { job_id, post_id, status, error_message, fb_id } = payload;

    if (!job_id) {
      return Response.json({ ok: false, error: "Missing job_id" }, { status: 400 });
    }

    console.log(`[FB_PUBLISH_CALLBACK] Nhận trạng thái từ n8n cho Job ${job_id}:`, status);

    // 1. Cập nhật Database (Supabase) dựa trên trạng thái
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    const targetState = status.toLowerCase() === 'success' ? 'PUBLISHED' : 'FAILED';
    const errorMessage = status.toLowerCase() !== 'success' ? (error_message || 'Unknown error during publish') : null;

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
      console.error('[FB_PUBLISH_CALLBACK] Lỗi update DB:', errText);
      return Response.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    } else {
      console.log(`[FB_PUBLISH_CALLBACK] Đã cập nhật task ${job_id} thành ${targetState}. FB_ID: ${fb_id || 'N/A'}`);
    }

    return Response.json({ ok: true, received: true });
  } catch (err: any) {
    console.error("[FB_PUBLISH_CALLBACK] Lỗi xử lý callback:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
