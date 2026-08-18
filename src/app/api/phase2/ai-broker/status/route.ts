import { NextResponse } from 'next/server';
import { getTenantApiKey } from '@/lib/llm-client';
import { createServiceRoleClient } from '@/lib/supabase-server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { taskId, provider, tenant_id, usage_id } = payload;

    if (!taskId || !provider || !tenant_id || !usage_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (provider !== 'kie_ai') {
      return NextResponse.json({ error: 'Status polling only supported for kie_ai currently' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch provider config to get base URL
    const { data: providerConfig, error: providerErr } = await supabase
      .schema('tenant_integration_vault')
      .from('integration_providers')
      .select('public_metadata, secret_credentials')
      .eq('provider_code', provider)
      .single();

    if (providerErr || !providerConfig) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 400 });
    }

    const metadata = providerConfig.public_metadata as any || {};
    const baseUrl = metadata.base_url ? metadata.base_url.replace(/\/$/, '') : 'https://api.kie.ai/v1';
    
    // Hardcode recordInfo for now since it's Kie AI specific
    const pollingUrl = `${baseUrl.includes('/api/v1') ? baseUrl : baseUrl.replace('/v1', '/api/v1')}/jobs/recordInfo?taskId=${taskId}`;
    
    // Get API Key
    const apiKey = await getTenantApiKey(tenant_id, provider);

    // 2. Poll KIE AI
    const pollRes = await fetch(pollingUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!pollRes.ok) {
       return NextResponse.json({ status: 'error', message: 'Failed to poll upstream' }, { status: 502 });
    }

    const pollJson = await pollRes.json();
    
    if (pollJson.data && pollJson.data.successFlag === 1 && pollJson.data.response && pollJson.data.response.resultImageUrl) {
      // 3. IMAGE IS READY! Create Outbox Record
      
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/llm_ledger_outbox`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          tenant_id: tenant_id,
          usage_id: usage_id,
          provider_code: provider,
          model_code: 'unknown', // We can get this from usage record if needed
          task_id: taskId,
          status: 'PENDING',
          estimated_cost: 0 // Cron will calculate it via parseUsage
        })
      });
        
      if (!insertRes.ok && insertRes.status !== 409) { // Ignore unique constraint violation if N8N polled twice
         console.error('Failed to create outbox record', await insertRes.text());
      }
      
      // Transform response to match OpenAI schema and Extract Visual logic ($json.data[0].url)
      const imageUrl = pollJson.data.response.resultImageUrl;
      
      return NextResponse.json({ status: 'completed', data: [ { url: imageUrl } ] }, { status: 200 });
      
    } else if (pollJson.data && (pollJson.data.status === 'failed' || pollJson.data.status === 'error' || pollJson.data.status === -1 || pollJson.data.successFlag === -1 || pollJson.data.successFlag === 2 || pollJson.data.successFlag === 3)) {
      
      // Mark usage as failed
      await fetch(`${supabaseUrl}/rest/v1/phase2_llm_usage?id=eq.${usage_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'FAILED' })
      });
      
      return NextResponse.json({ status: 'failed', error: 'Kie AI async task failed', details: pollJson }, { status: 500 });
    }

    // 4. Still generating
    // Return 425 Too Early so N8N can use its built-in "Retry On Fail" feature instead of a complex loop
    return NextResponse.json({ status: 'processing', message: 'Image is still generating. Please retry.' }, { status: 425 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
