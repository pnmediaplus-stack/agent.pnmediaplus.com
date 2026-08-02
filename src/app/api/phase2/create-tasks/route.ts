import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

const TaskSchema = z.object({
  department_id: z.string(),
  task_key: z.string(),
  title: z.string(),
  intent_type: z.string().default('unknown'),
  priority: z.number().int().min(1).max(100).default(50),
  requester_actor_type: z.enum(['HUMAN', 'AGENT', 'SYSTEM']),
  requester_external_ref: z.string().optional(),
  owner_label: z.string().default('AI Agent'),
  owner_agent_id: z.string().optional(),
});

const CreateTasksSchema = z.object({
  tenant_id: z.string(), // Added for billing/isolation context
  workflow_run_id: z.string().optional(),
  tasks: z.array(TaskSchema)
}).passthrough();

export async function POST(req: Request) {
  const guard = await verifyN8nWebhook(req, 'create_tasks', CreateTasksSchema);
  if (!guard.ok) return guard.response;
  if (guard.duplicate) return guard.response;

  const { logCompletion, payload } = guard;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');

  if (!serviceKey || !supabaseUrl) {
    await logCompletion('FAILED', 'Missing Supabase Config');
    return NextResponse.json({ error: 'CONFIG_ERROR' }, { status: 500 });
  }

  try {
    const insertPayload = payload.tasks.map(t => ({
      ...t,
      state: 'NOT_STARTED',
      requester_external_ref: t.requester_external_ref || 'unknown'
    }));

    const response = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'Accept-Profile': 'pn_os_ai_department',
        'Content-Profile': 'pn_os_ai_department'
      },
      body: JSON.stringify(insertPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Handle Postgres unique constraint violation gracefully (Idempotency)
      if (response.status === 409 && errorText.includes('duplicate key')) {
        await logCompletion('ACCEPTED', 'Idempotent skip (Tasks already exist)');
        return NextResponse.json({ message: 'Tasks already exist', idempotent: true }, { status: 200 });
      }
      throw new Error(`DB Insert Failed: ${response.status} ${errorText}`);
    }

    const insertedData = await response.json();
    await logCompletion('ACCEPTED', `Created ${payload.tasks.length} tasks successfully`);
    
    return NextResponse.json({ success: true, count: payload.tasks.length, data: insertedData });

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
