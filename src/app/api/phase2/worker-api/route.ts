import { NextResponse } from 'next/server';
import { z } from 'zod';

const WorkerApiSchema = z.object({
  action: z.enum(['get_pending_tasks', 'complete_task']),
  taskId: z.string().uuid().optional(),
  outputPayload: z.any().optional(),
  chatMessage: z.string().optional(),
  threadId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CONTROL_PLANE_SECRET}`) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WorkerApiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'BAD_REQUEST', issues: parsed.error.issues }, { status: 400 });
    }

    const { action, taskId, outputPayload, chatMessage, threadId } = parsed.data;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Accept-Profile': 'pn_os_ai_department',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (action === 'get_pending_tasks') {
      const res = await fetch(`${supabaseUrl}/rest/v1/tasks?status=eq.PENDING&order=created_at.asc`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const tasks = await res.json() || [];
      
      for (const t of tasks) {
        await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${t.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ state: 'PARTIAL', started_at: new Date().toISOString() })
        });
      }
      return NextResponse.json({ tasks });
    }

    if (action === 'complete_task') {
      if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
      
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ 
          state: 'PASS', 
          completed_at: new Date().toISOString(), 
          metadata: outputPayload || {} 
        })
      });
      if (!updateRes.ok) throw new Error(await updateRes.text());
      const updatedTask = (await updateRes.json())[0];

      if (chatMessage && threadId && updatedTask) {
        const chatRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            organization_id: updatedTask.organization_id, // Extract org from task
            thread_id: threadId,
            sender: 'agent',
            body: chatMessage,
            intent_type: 'unknown'
          })
        });
        
        if (!chatRes.ok) {
          console.error("Failed to insert chat message in worker API:", await chatRes.text());
        }
      }

      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });

  } catch (error: any) {
    console.error('Worker API Error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}

