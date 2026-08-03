import { NextResponse } from 'next/server';
import { getIntegrationsConfig } from '@/lib/config/integrations';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('x-cron-secret');
  const secret = authHeader?.replace('Bearer ', '');
  
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
  }

  // Lấy cấu hình Facebook đã được lưu an toàn (đã được tự động decrypt trong hàm getIntegrationsConfig)
  const config = getIntegrationsConfig();
  const fbConfig = config.facebook;

  if (!fbConfig || !fbConfig.enabled || !fbConfig.pageId || !fbConfig.accessToken) {
    return NextResponse.json({ success: false, message: 'Facebook integration is disabled or missing configuration.' });
  }

  try {
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Tìm 1 Task đang ở trạng thái APPROVED
    const tasksRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?state=eq.APPROVED&limit=1`, {
      headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department' }
    });
    
    if (!tasksRes.ok) throw new Error('Failed to fetch APPROVED tasks');
    const tasks = await tasksRes.json();

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending APPROVED tasks to publish.' });
    }

    const task = tasks[0];

    // 2. Tìm Artifact tương ứng của Task này qua quan hệ metadata rõ ràng (Strict Contract)
    const targetArtifactId = task.metadata?.artifact_id;
    if (!targetArtifactId) {
      return NextResponse.json({ success: false, message: `Task ${task.id} is APPROVED but lacks metadata.artifact_id to find the artifact.` });
    }

    const artRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/artifact_versions?artifact_id=eq.${targetArtifactId}&select=*&limit=1&order=version_number.desc`, {
      headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department' }
    });
    
    let artifactId = targetArtifactId;
    let postContent = "";

    if (artRes.ok) {
      const versions = await artRes.json();
      if (versions && versions.length > 0) {
        postContent = versions[0].content_ref || "";
      }
    }

    if (!artifactId || !postContent) {
      return NextResponse.json({ success: false, message: `Task ${task.id} is APPROVED but has no valid artifact to publish.` });
    }

    // 3. Chuẩn bị Payload gửi sang n8n FB Executor
    const fbPayload = {
      job_id: task.id,
      post_id: artifactId,
      post: {
        mode: "text",
        content: postContent,
        media_urls: []
      },
      page: {
        id: fbConfig.pageId,
        access_token: fbConfig.accessToken
      }
    };

    // 4. Khóa/Claim Task: Đổi state thành PUBLISHING trước khi bắn webhook
    // Sử dụng optimistic locking: chỉ update nếu state vẫn đang là APPROVED
    const updateRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?id=eq.${task.id}&state=eq.APPROVED`, {
      method: 'PATCH',
      headers: { 
        ...headers, 
        'Content-Profile': 'pn_os_ai_department',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ state: 'PUBLISHING' })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update task state to PUBLISHING: ${errText}`);
    }

    const updatedTasks = await updateRes.json();
    if (!updatedTasks || updatedTasks.length === 0) {
      return NextResponse.json({ success: false, message: `Task ${task.id} was already claimed or is no longer APPROVED.` });
    }

    // 5. Bắn sang n8n
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.pnmediaplus.com";
    const n8nRes = await fetch(`${n8nUrl}/webhook/campaign-submit-v2-final`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fbPayload)
    });

    if (!n8nRes.ok) {
      // Nếu n8n webhook lỗi, rollback trạng thái về APPROVED (Fail-closed)
      await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Profile': 'pn_os_ai_department' },
        body: JSON.stringify({ state: 'APPROVED' })
      });
      throw new Error(`n8n webhook failed with status ${n8nRes.status}. Task state rolled back to APPROVED.`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Draft published to FB queue.', 
      taskId: task.id 
    });

  } catch (err) {
    console.error('publish-drafts error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
