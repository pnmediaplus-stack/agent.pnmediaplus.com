import { NextResponse } from 'next/server';
import { z } from 'zod';

type GuardResult<T> = 
  | { ok: false; response: NextResponse }
  | { ok: true; duplicate: true; response: NextResponse }
  | { ok: true; duplicate: false; payload: T; requestId: string; logCompletion: (status: 'ACCEPTED' | 'FAILED', reason?: string, metadata?: any) => Promise<void> };

export async function verifyN8nWebhook<T>(
  req: Request, 
  actionName: string, 
  schema: z.ZodType<T>
): Promise<GuardResult<T>> {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  const writeAuditLog = async (status: 'ACCEPTED' | 'REJECTED' | 'FAILED', reason: string, reqId: string, extraMeta: any = {}) => {
    if (!supabaseUrl || !serviceKey) return;
    try {
      const mappedState = status === 'ACCEPTED' ? 'PASS' : 'BLOCKED';
      
      const { createHash } = await import('crypto');
      const timestamp = new Date().toISOString();
      const eventHash = createHash('sha256')
        .update(`webhook|SYSTEM|n8n:webhook_client|${actionName}|WORKFLOW_RUN|${reqId}|${reason}|${timestamp}`)
        .digest('hex');

      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Accept-Profile': 'pn_os_ai_department',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actor_type: 'SYSTEM',
          actor_external_ref: 'n8n:webhook_client',
          action: actionName,
          entity_type: 'WORKFLOW_RUN',
          entity_id: reqId,
          before_state: 'NOT_STARTED',
          after_state: mappedState,
          reason: JSON.stringify({ message: reason, ...extraMeta }),
          request_id: reqId,
          event_hash: eventHash
        })
      });
    } catch (e) {
      console.error(`Failed to write audit log for ${reqId}:`, e);
    }
  };

  // 1. Check Request ID (Idempotency Key)
  const requestId = req.headers.get('x-request-id')?.trim();
  if (!requestId) {
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing x-request-id header' }, { status: 400 }) 
    };
  }

  // 2. Authentication
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CONTROL_PLANE_SECRET?.trim();
  
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    await writeAuditLog('REJECTED', 'Invalid or missing CONTROL_PLANE_SECRET', requestId);
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 }) 
    };
  }

  // 3. Idempotency Check
  if (supabaseUrl && serviceKey) {
    try {
      const url = `${supabaseUrl}/rest/v1/audit_logs?action=eq.${actionName}&after_state=eq.PASS&request_id=eq.${requestId}&select=id`;
      const res = await fetch(url, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Accept-Profile': 'pn_os_ai_department'
        }
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Already processed successfully
        return {
          ok: true,
          duplicate: true,
          response: NextResponse.json({ success: true, duplicate: true, message: 'Request already processed' }, { status: 200 })
        };
      }
    } catch (e) {
      console.error('Idempotency check failed:', e);
      // Fail-closed? If DB is down, we probably shouldn't proceed to avoid double execution.
      return { 
        ok: false, 
        response: NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to verify idempotency state' }, { status: 500 }) 
      };
    }
  } else {
      return { 
        ok: false, 
        response: NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Missing Supabase credentials' }, { status: 500 }) 
      };
  }

  // 4. Payload Parsing & Boundary Validation
  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch (e) {
    await writeAuditLog('REJECTED', 'Invalid JSON payload', requestId);
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 }) 
    };
  }

  const validation = schema.safeParse(rawBody);
  if (!validation.success) {
    const errorDetails = validation.error.format();
    console.error(`[n8n Guard] Schema Validation Failed for ${actionName}:`, JSON.stringify(errorDetails, null, 2), "Raw Body:", rawBody);
    await writeAuditLog('REJECTED', 'Schema validation failed', requestId, { errors: errorDetails });
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'BAD_REQUEST', message: 'Schema validation failed', details: errorDetails }, { status: 400 }) 
    };
  }

  const logCompletion = async (status: 'ACCEPTED' | 'FAILED', reason: string = 'Successfully processed webhook', metadata?: any) => {
    await writeAuditLog(status, reason, requestId, metadata);
  };

  return {
    ok: true,
    duplicate: false,
    payload: validation.data,
    requestId,
    logCompletion
  };
}
