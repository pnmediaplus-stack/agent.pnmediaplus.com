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

    const normalizedProvider = provider === 'kie.ai' ? 'kie_ai' : provider;

    if (normalizedProvider !== 'kie_ai') {
      return NextResponse.json({ error: 'Status polling only supported for kie_ai currently' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch provider config via RPC to bypass PGRST106 schema restriction
    const { data: providers, error: providerErr } = await supabase.rpc('phase077_get_active_integration_providers');
    const providerConfig = Array.isArray(providers) ? providers.find(p => p.provider_code === normalizedProvider) : null;

    if (providerErr || !providerConfig) {
      return NextResponse.json({ error: 'Provider not found in active catalog' }, { status: 400 });
    }

    const metadata = providerConfig.public_metadata as any || {};
    const baseUrl = metadata.base_url ? metadata.base_url.replace(/\/$/, '') : 'https://api.kie.ai/v1';
    
    // Hardcode recordInfo for now since it's Kie AI specific
    const pollingUrl = `${baseUrl.includes('/api/v1') ? baseUrl : baseUrl.replace('/v1', '/api/v1')}/jobs/recordInfo?taskId=${taskId}`;
    
    // Get API Key
    const apiKey = await getTenantApiKey(tenant_id, normalizedProvider);

    // 2. Poll KIE AI
    const pollRes = await fetch(pollingUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!pollRes.ok) {
       return NextResponse.json({ status: 'error', message: 'Failed to poll upstream' }, { status: 502 });
    }

    const pollJson = await pollRes.json();
    
    if (pollJson.data && pollJson.data.successFlag === 1) {
      let imageUrl = null;
      if (pollJson.data.response && pollJson.data.response.resultImageUrl) {
        imageUrl = pollJson.data.response.resultImageUrl;
      } else if (pollJson.data.images && Array.isArray(pollJson.data.images) && pollJson.data.images.length > 0) {
        imageUrl = typeof pollJson.data.images[0] === 'string' ? pollJson.data.images[0] : pollJson.data.images[0].url;
      } else if (pollJson.data.url) {
        imageUrl = pollJson.data.url;
      }

      if (imageUrl) {
        // 3. IMAGE IS READY! Create Outbox Record idempotently
        let outboxId = '';
        
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/llm_ledger_outbox?usage_id=eq.${usage_id}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const checkData = checkRes.ok ? await checkRes.json() : [];
        
        if (checkData && checkData.length > 0) {
          outboxId = checkData[0].id;
        } else {
          const insertRes = await fetch(`${supabaseUrl}/rest/v1/llm_ledger_outbox`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              tenant_id: tenant_id,
              usage_id: usage_id,
              provider_code: provider,
              model_code: 'unknown',
              task_id: taskId,
              status: 'PENDING',
              estimated_cost: 0
            })
          });
            
          if (insertRes.ok) {
             const insertData = await insertRes.json();
             outboxId = insertData[0].id;
          } else if (insertRes.status === 409) {
             const checkRes2 = await fetch(`${supabaseUrl}/rest/v1/llm_ledger_outbox?usage_id=eq.${usage_id}&select=id`, {
               headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
             });
             const checkData2 = checkRes2.ok ? await checkRes2.json() : [];
             if (checkData2 && checkData2.length > 0) outboxId = checkData2[0].id;
          } else {
             console.error('Failed to create outbox record', await insertRes.text());
          }
        }
        
        return NextResponse.json({ status: 'completed', outbox_id: outboxId, data: [ { url: imageUrl } ] }, { status: 200 });
      }
    }
    
    if (pollJson.data && (pollJson.data.status === 'failed' || pollJson.data.status === 'error' || pollJson.data.status === -1 || pollJson.data.successFlag === -1 || pollJson.data.successFlag === 2 || pollJson.data.successFlag === 3)) {
      
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

    // 4. Still generating or format unrecognized
    // Return 202 Accepted with explicit status for N8N to handle via Do-While loop
    return NextResponse.json({ 
      status: 'processing', 
      message: `Image is still generating or format unrecognized. Raw response: ${JSON.stringify(pollJson.data)}`,
      taskId,
      outbox_id: null
    }, { status: 202 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
