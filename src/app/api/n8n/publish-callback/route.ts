export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { job_id, post_id, status, error_message, fb_id } = payload;

    if (!job_id) {
      return Response.json({ ok: false, error: "Missing job_id" }, { status: 400 });
    }

    console.log(`[FB_PUBLISH_CALLBACK] Nhận trạng thái từ n8n cho Job ${job_id}:`, status);

    // 1. Cập nhật Database (Supabase) dựa trên trạng thái
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceKey) {
      const targetState = status.toLowerCase() === 'success' ? 'PUBLISHED' : 'FAILED';
      const errorMessage = status.toLowerCase() !== 'success' ? (error_message || 'Unknown error during publish') : null;

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${job_id}`, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ 
            status: targetState,
            // (Nếu có cột lưu metadata, ta có thể lưu fb_id và errorMessage vào đó)
          })
        });
        
        if (!res.ok) {
          console.error('[FB_PUBLISH_CALLBACK] Lỗi update DB:', await res.text());
        } else {
          console.log(`[FB_PUBLISH_CALLBACK] Đã cập nhật task ${job_id} thành ${targetState}. FB_ID: ${fb_id || 'N/A'}`);
        }
      } catch (dbErr) {
        console.error('[FB_PUBLISH_CALLBACK] Request update DB thất bại:', dbErr);
      }
    }

    return Response.json({ ok: true, received: true });
  } catch (err: any) {
    console.error("[FB_PUBLISH_CALLBACK] Lỗi xử lý callback:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
