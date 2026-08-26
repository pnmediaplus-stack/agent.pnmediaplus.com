import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadPortalOrganizationContext, readPortalAccessToken } from '@/lib/portal-auth';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

type CrmRouteContext<TPayload> = {
  organizationId: string;
  payload: TPayload;
  userId: string;
};

type CrmRouteContextResult<TPayload> =
  | { ok: true; context: CrmRouteContext<TPayload> }
  | { ok: false; response: NextResponse };

export async function requireCrmRouteContext<TPayload = any>(
  req: Request,
  schema?: z.ZodType<TPayload>
): Promise<CrmRouteContextResult<TPayload>> {
  const auth = await verifyUiAuth(req, schema);
  if (!auth.ok) return auth;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  if (orgContext.state !== 'ready') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'FORBIDDEN', message: 'Org context not ready' },
        { status: 403 }
      )
    };
  }

  return {
    ok: true,
    context: {
      organizationId: orgContext.active_membership.organization_id,
      payload: auth.payload,
      userId: auth.user.id
    }
  };
}

function getSupabaseRestConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_CONFIG_MISSING');
  }

  return { supabaseUrl, serviceRoleKey };
}

export async function fetchSupabaseRest(
  path: string,
  init: RequestInit & {
    searchParams?: Record<string, string | number | boolean | null | undefined>;
    prefer?: string;
  } = {}
) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseRestConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path.replace(/^\//, '')}`);

  for (const [key, value] of Object.entries(init.searchParams || {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return fetch(url.toString(), {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...init.headers
    },
    cache: init.cache || 'no-store'
  });
}

export async function readRestJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

