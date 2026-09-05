import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readPortalAccessToken, verifySupabaseAccessToken } from '@/lib/portal-auth';

type UiAuthGuardResult<T> = 
  | { ok: false; response: NextResponse }
  | { ok: true; payload: T; user: { id: string; email: string }; logAudit: (action: string, reason: string, metadata?: any) => Promise<void> };

export async function verifyUiAuth<T>(
  req: Request, 
  schema?: z.ZodType<T>
): Promise<UiAuthGuardResult<T>> {
  
  // 1. Authentication
  const accessToken = readPortalAccessToken(req.headers);
  const user = await verifySupabaseAccessToken(accessToken);

  if (!user) {
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'UNAUTHORIZED', message: 'No valid portal session.' }, { status: 401 }) 
    };
  }

  // 2. Payload Parsing & Boundary Validation (if schema provided)
  let payload = {} as T;
  
  if (schema) {
    let rawBody: any;
    try {
      if (req.method !== 'GET') {
        rawBody = await req.json();
      } else {
        // For GET requests, we parse URL search params
        const url = new URL(req.url);
        rawBody = Object.fromEntries(url.searchParams.entries());
      }
    } catch (e) {
      return { 
        ok: false, 
        response: NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid payload' }, { status: 400 }) 
      };
    }

    const validation = schema.safeParse(rawBody);
    if (!validation.success) {
      return { 
        ok: false, 
        response: NextResponse.json({ error: 'BAD_REQUEST', message: 'Schema validation failed', details: validation.error.format() }, { status: 400 }) 
      };
    }
    payload = validation.data;
  }

  // 3. Audit Logging helper
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  const logAudit = async (action: string, reason: string, metadata: any = {}) => {
    if (!supabaseUrl || !serviceKey) {
      throw new Error('AUDIT_CONFIG_MISSING: Supabase URL or Service Role Key is missing for audit logging.');
    }
    const detailsPayload = metadata && Object.keys(metadata).length > 0
      ? `${reason} | metadata: ${JSON.stringify({ actor_id: user.id, ...metadata })}`
      : reason;

    const auditRes = await fetch(`${supabaseUrl}/rest/v1/phase1_audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entityType: 'chat',
        entityId: metadata?.entityId || crypto.randomUUID(),
        action,
        actor: user.email || user.id,
        details: detailsPayload
      })
    });

    if (!auditRes.ok) {
      const errBody = await auditRes.text().catch(() => '');
      throw new Error(`AUDIT_LOG_WRITE_FAILED: HTTP ${auditRes.status} - ${errBody}`);
    }
  };

  return {
    ok: true,
    payload,
    user,
    logAudit
  };
}
