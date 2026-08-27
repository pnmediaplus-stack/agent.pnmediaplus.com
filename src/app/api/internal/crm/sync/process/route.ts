import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Next.js setting for longer execution

async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 500) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return res;
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Max retries reached');
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const internalSecretHeader = req.headers.get('x-internal-secret') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();

    if (!expectedSecret || (bearerToken !== expectedSecret && internalSecretHeader !== expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 20 } = await req.json().catch(() => ({}));

    const claimRes = await fetchSupabaseRest('rpc/crm_claim_customer_sync_jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_limit: limit })
    });

    if (!claimRes.ok) {
      return NextResponse.json({ error: 'Failed to claim jobs', details: await claimRes.text() }, { status: 500 });
    }

    const jobs = await claimRes.json();
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const cpUrl = (process.env.NEXTJS_CONTROL_PLANE_BASE_URL || '').replace(/\/$/, '');
    let successCount = 0;
    let failedCount = 0;

    for (const job of jobs) {
      try {
        if (job.provider !== 'facebook') {
          throw new Error('Unsupported provider: ' + job.provider);
        }

        const channelRes = await fetchSupabaseRest('crm_channels', {
          searchParams: { id: `eq.${job.channel_id}`, select: 'channel_external_id' }
        });
        const [channelData] = await channelRes.json();
        if (!channelData) throw new Error('Channel not found');

        const pageId = channelData.channel_external_id;
        const integrationKey = `facebook_page_${pageId}`;
        const vaultRefRes = await fetchSupabaseRest('rpc/phase075_get_tenant_vault_credential_ref', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_organization_id: job.organization_id, p_integration_key: integrationKey })
        });

        let referenceToken = null;
        if (vaultRefRes.ok) referenceToken = await vaultRefRes.json().catch(() => null);
        if (!referenceToken) throw new Error('Missing vault reference token');

        if (!cpUrl) throw new Error('Missing cpUrl');

        const redeemRes = await fetch(`${cpUrl}/api/byok/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${expectedSecret}`,
            'x-broker-internal-secret': process.env.BROKER_INTERNAL_SECRET || expectedSecret
          },
          body: JSON.stringify({ organization_id: job.organization_id, integration_key: integrationKey, reference_token: referenceToken })
        });

        if (!redeemRes.ok) throw new Error('Failed to redeem BYOK token');
        const redeemJson = await redeemRes.json();
        const accessToken = redeemJson?.data?.access_token;
        if (!accessToken) throw new Error('No access token in BYOK response');

        const fbRes = await fetchWithRetry(`https://graph.facebook.com/v19.0/${job.external_user_id}?fields=name,profile_pic&access_token=${accessToken}`, {});
        if (!fbRes.ok) throw new Error('Graph API error: ' + await fbRes.text());
        
        const fbData = await fbRes.json();
        
        if (fbData.name) {
          const patchBody: any = { full_name: fbData.name };
          if (fbData.profile_pic) patchBody.avatar_url = fbData.profile_pic;

          const updateRes = await fetchSupabaseRest('crm_customers', {
            method: 'PATCH',
            searchParams: { id: `eq.${job.customer_id}` },
            body: JSON.stringify(patchBody)
          });
          if (!updateRes.ok) throw new Error('Failed to patch crm_customers');
        }

        await fetchSupabaseRest('crm_customer_sync_jobs', {
          method: 'PATCH',
          searchParams: { id: `eq.${job.id}` },
          body: JSON.stringify({ status: 'processed', last_error: null })
        });
        successCount++;

      } catch (err: any) {
        console.error(`Sync Job ${job.id} failed:`, err.message);
        
        const nextAttempt = job.attempt_count + 1;
        let newStatus = 'retry_pending';
        let backoffMinutes = 0;
        
        if (nextAttempt === 1) backoffMinutes = 0.5; // 30s
        else if (nextAttempt === 2) backoffMinutes = 2; // 2m
        else if (nextAttempt === 3) backoffMinutes = 10; // 10m
        else newStatus = 'failed';

        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60000).toISOString();

        await fetchSupabaseRest('crm_customer_sync_jobs', {
          method: 'PATCH',
          searchParams: { id: `eq.${job.id}` },
          body: JSON.stringify({
            status: newStatus,
            attempt_count: nextAttempt,
            next_retry_at: nextRetryAt,
            last_error: err.message
          })
        });
        failedCount++;
      }
    }

    return NextResponse.json({ success: true, processed: successCount, failed: failedCount });
  } catch (error: any) {
    console.error('Customer sync worker error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
