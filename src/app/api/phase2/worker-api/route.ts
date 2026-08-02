import { insertChatMessage, getPendingTasks, updateTaskFromWorker } from '@/lib/phase1-loader';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase-client';
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

    if (action === 'get_pending_tasks') {
      const res = await getPendingTasks();
      if (res.error) throw new Error(res.error);
      const tasks = res.data || [];
      
      // Mark them as PARTIAL immediately so other workers don't pick them up
      for (const t of tasks) {
        await updateTaskFromWorker(t.id, { state: 'PARTIAL', started_at: new Date().toISOString() });
      }
      return NextResponse.json({ tasks });
    }

    if (action === 'complete_task') {
      if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
      
      // Update task to PASS
      const updateRes = await updateTaskFromWorker(taskId, { 
        state: 'PASS', 
        completed_at: new Date().toISOString(), 
        metadata: outputPayload || {} 
      });
      if (updateRes.error) throw new Error(updateRes.error);

      // If there is a chat message to send back to the user
      if (chatMessage && threadId) {
        const chatRes = await insertChatMessage({
          threadId: threadId,
          sender: 'agent',
          body: chatMessage,
          intentType: 'unknown'
        });
        
        if (chatRes.error) {
          console.error("Failed to insert chat message in worker API:", chatRes.error);
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

