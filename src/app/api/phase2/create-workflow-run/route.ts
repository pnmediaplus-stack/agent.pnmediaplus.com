import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

const CreateWorkflowRunSchema = z.object({
  department_id: z.string(),
  workflow_key: z.string(),
  workflow_name: z.string(),
  idempotency_key: z.string(),
  tenant_id: z.string(), // Added for billing/isolation context
  created_by_actor_type: z.enum(['HUMAN', 'AGENT', 'SYSTEM']),
  created_by_external_ref: z.string().optional()
}).passthrough();

export async function POST(req: Request) {
  const guard = await verifyN8nWebhook(req, 'create_workflow_run', CreateWorkflowRunSchema);
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
    const insertPayload = {
      department_id: payload.department_id,
      workflow_key: payload.workflow_key,
      workflow_name: payload.workflow_name,
      idempotency_key: payload.idempotency_key,
      created_by_actor_type: payload.created_by_actor_type,
      created_by_external_ref: payload.created_by_external_ref || 'unknown',
      state: 'PARTIAL',
      run_status: 'QUEUED',
      n8n_execution_id: req.headers.get('x-request-id') // map request id to n8n execution
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/workflow_runs`, {
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
        await logCompletion('ACCEPTED', 'Idempotent skip (Already exists)');
        return NextResponse.json({ message: 'Already exists', idempotent: true }, { status: 200 });
      }
      throw new Error(`DB Insert Failed: ${response.status} ${errorText}`);
    }

    const insertedData = await response.json();
    await logCompletion('ACCEPTED', 'Workflow run created successfully');
    
    return NextResponse.json(Array.isArray(insertedData) ? insertedData[0] : insertedData);

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
