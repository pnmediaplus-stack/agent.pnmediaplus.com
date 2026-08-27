import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export async function GET(request: Request) {
  try {
    const auth = await verifyUiAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await readPortalAccessToken(request);
    const orgCtx = await loadPortalOrganizationContext(accessToken!);
    if (!orgCtx) return NextResponse.json({ error: 'Organization context not found' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channel_id');

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let url = `${supabaseUrl}/rest/v1/crm_campaign_rules?organization_id=eq.${orgCtx.organization_id}&order=created_at.desc`;
    if (channelId) {
      url += `&channel_id=eq.${channelId}`;
    }

    const res = await fetch(url, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey!}`
      }
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'DB_ERROR', details: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Campaigns GET error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyUiAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await readPortalAccessToken(request);
    const orgCtx = await loadPortalOrganizationContext(accessToken!);
    if (!orgCtx) return NextResponse.json({ error: 'Organization context not found' }, { status: 403 });

    const body = await request.json();
    const { channel_id, name, is_active, condition_hours_inactive, system_prompt_override } = body;

    if (!channel_id || !name || !condition_hours_inactive || !system_prompt_override) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Verify channel ownership
    const channelRes = await fetch(`${supabaseUrl}/rest/v1/crm_channels?id=eq.${channel_id}&organization_id=eq.${orgCtx.organization_id}`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey!}`
      }
    });
    const channelData = await channelRes.json();
    if (!channelData || channelData.length === 0) {
      return NextResponse.json({ error: 'Invalid channel or ownership' }, { status: 403 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/crm_campaign_rules`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        organization_id: orgCtx.organization_id,
        channel_id,
        name,
        is_active: is_active ?? false,
        condition_hours_inactive,
        system_prompt_override
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'DB_INSERT_FAILED', details: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Campaigns POST error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await verifyUiAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await readPortalAccessToken(request);
    const orgCtx = await loadPortalOrganizationContext(accessToken!);
    if (!orgCtx) return NextResponse.json({ error: 'Organization context not found' }, { status: 403 });

    const body = await request.json();
    const { id, is_active, condition_hours_inactive, name, system_prompt_override } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (condition_hours_inactive !== undefined) updates.condition_hours_inactive = condition_hours_inactive;
    if (name !== undefined) updates.name = name;
    if (system_prompt_override !== undefined) updates.system_prompt_override = system_prompt_override;

    const res = await fetch(`${supabaseUrl}/rest/v1/crm_campaign_rules?id=eq.${id}&organization_id=eq.${orgCtx.organization_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'DB_UPDATE_FAILED', details: err }, { status: res.status });
    }
    
    const data = await res.json();
    if (data.length === 0) {
        return NextResponse.json({ error: 'Not found or not modified' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Campaigns PUT error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
      const auth = await verifyUiAuth(request);
      if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
      const accessToken = await readPortalAccessToken(request);
      const orgCtx = await loadPortalOrganizationContext(accessToken!);
      if (!orgCtx) return NextResponse.json({ error: 'Organization context not found' }, { status: 403 });
  
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
  
      if (!id) {
        return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
      }
  
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
      const res = await fetch(`${supabaseUrl}/rest/v1/crm_campaign_rules?id=eq.${id}&organization_id=eq.${orgCtx.organization_id}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey!}`
        }
      });
  
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: 'DB_DELETE_FAILED', details: err }, { status: res.status });
      }
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Campaigns DELETE error:', error);
      return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }
  }
