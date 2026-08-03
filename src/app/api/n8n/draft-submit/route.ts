import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  // 1. Auth Gate (Strict Contract)
  const authHeader = request.headers.get('x-n8n-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (process.env.N8N_API_KEY && authHeader !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { task_id, content } = body;

    // Fail-closed nếu thiếu dữ liệu
    if (!task_id || !content) {
      return NextResponse.json({ error: 'Missing task_id or content. Fail-closed.' }, { status: 400 });
    }

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'pn_os_ai_department',
      'Content-Profile': 'pn_os_ai_department'
    };

    // 2. Lấy thông tin Task (xác minh tồn tại)
    const taskRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?id=eq.${task_id}&select=*&limit=1`, { headers });
    if (!taskRes.ok) throw new Error('Failed to fetch task');
    const tasks = await taskRes.json();
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: 'Task not found. Fail-closed.' }, { status: 404 });
    }
    const task = tasks[0];

    // Tạo mã băm SHA256 cho content (đúng chuẩn contract)
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');

    // 3. Tạo Artifact (Bản nháp)
    const artifactTimestamp = Date.now();
    const artifactPayload = {
      artifact_key: `art_fb_${artifactTimestamp}`,
      creator_actor_type: 'SYSTEM',
      creator_external_ref: 'n8n_ai_worker',
      canonical_name: `Draft for: ${task.title}`,
      artifact_type: 'DOCUMENT',
      department_id: task.department_id,
      state: 'REVIEW',
      version_label: 'v1.0',
      task_id: task.id
    };

    const artRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/artifacts`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(artifactPayload)
    });
    if (!artRes.ok) throw new Error('Failed to create artifact: ' + await artRes.text());
    const newArtifact = (await artRes.json())[0];

    // 4. Lưu content vào artifact_versions
    const versionPayload = {
      artifact_id: newArtifact.id,
      version_number: 1,
      state: 'DRAFT',
      created_by_actor_type: 'SYSTEM',
      created_by_external_ref: 'n8n_ai_worker',
      content_ref: content,
      content_sha256: sha256,
      source_task_id: task.id
    };
    
    const verRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/artifact_versions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(versionPayload)
    });
    if (!verRes.ok) throw new Error('Failed to create artifact_version: ' + await verRes.text());

    // 5. Cập nhật lại Task: Liên kết artifact_id, sha256 và chuyển state sang REVIEW
    const taskUpdatePayload = {
      state: 'REVIEW',
      metadata: {
        ...(task.metadata || {}),
        artifact_id: newArtifact.id,
        sha256: sha256
      }
    };

    const taskUpdateRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?id=eq.${task.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(taskUpdatePayload)
    });
    if (!taskUpdateRes.ok) throw new Error('Failed to update task: ' + await taskUpdateRes.text());
    const updatedTask = (await taskUpdateRes.json())[0];

    return NextResponse.json({ success: true, task: updatedTask, artifact: newArtifact });

  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error', details: String(err) }, { status: 500 });
  }
}
