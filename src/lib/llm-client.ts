import { z } from 'zod';
import { getProvider } from './ai-providers';
import { issueReferenceToken, redeemReferenceToken } from './byok-secret-broker';

function getSupabaseRuntimeInfo() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  let supabaseHost: string | null = null;
  let supabaseProjectRef: string | null = null;

  if (supabaseUrl) {
    try {
      const parsedUrl = new URL(supabaseUrl);
      supabaseHost = parsedUrl.host;
      supabaseProjectRef = parsedUrl.hostname.split('.')[0] || null;
    } catch {
      supabaseHost = supabaseUrl;
    }
  }

  return {
    supabaseUrl,
    supabaseHost,
    supabaseProjectRef,
  };
}

export async function getTenantApiKey(tenantId: string, providerCode: string): Promise<string> {
  const { supabaseUrl, supabaseHost, supabaseProjectRef } = getSupabaseRuntimeInfo();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Missing Supabase server keys.');
  }

  const { createServiceRoleClient } = await import('./supabase-server');
  const supabase = createServiceRoleClient();

  const { data: activeIntegration, error: activeIntegrationError } = await supabase.rpc(
    'phase076_get_runtime_tenant_integration_status',
    {
      p_organization_id: tenantId,
      p_provider_code: providerCode,
      p_integration_key: null,
    }
  );

  if (activeIntegrationError) {
    throw new Error(`VAULT_CREDENTIAL_NOT_READY: Failed to query active tenant integration - ${activeIntegrationError.message}`);
  }

  const integrationRow = Array.isArray(activeIntegration) ? activeIntegration[0] : activeIntegration;

  if (!integrationRow) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: No configured healthy integration found for this tenant/provider.');
  }

  const integration = integrationRow as Record<string, unknown>;
  const integrationKey = String(integration.integration_key || '').trim();
  const resolvedProviderCode = String(integration.provider_code || '').trim();

  if (!integrationKey) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Tenant integration is missing integration_key.');
  }

  if (resolvedProviderCode !== providerCode) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Provider scope mismatch for configured integration.');
  }

  const { data: credentialRef, error: credentialRefError } = await supabase.rpc(
    'phase075_get_tenant_vault_credential_ref',
    {
      p_organization_id: tenantId,
      p_integration_key: integrationKey
    }
  );

  if (credentialRefError) {
    throw new Error(`VAULT_CREDENTIAL_NOT_READY: Failed to query credential ref - ${credentialRefError.message}`);
  }

  if (!credentialRef || typeof credentialRef !== 'string' || !credentialRef.trim()) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Credential reference not found in private tenant integration.');
  }

  // 3. Issue and redeem token (in-memory only, one-time use)
  const actor = { actorType: 'SYSTEM' as any, actorRef: 'llm-client' };
  const tokenReq = await issueReferenceToken({ credential_ref: credentialRef, scope: 'llm:invoke' }, actor);
  const secretData = await redeemReferenceToken(tokenReq.lease_token, tenantId, integrationKey, actor);
  
  if (!secretData.access_token) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Decrypted secret is empty.');
  }

  // Extract only the first line in case the user pasted a multiline .env block
  const rawKey = String(secretData.access_token).trim();
  const actualKey = rawKey.split('\n')[0].trim();

  return actualKey;
}

export type LlmClientOptions = {
  actorId: string;
  tenantId: string;
  requestId?: string;
  endpointUrl?: string; // e.g. custom BYOK url
  async?: boolean;
};

export type LlmPayload = {
  provider?: string; // Defaults to openai if missing
  model: string;
  [key: string]: any;
};

// Default Daily Quota if not configured
const DEFAULT_DAILY_QUOTA = 100000;

export async function invokeLlm(payload: LlmPayload, options: LlmClientOptions) {
  const { supabaseUrl, supabaseHost, supabaseProjectRef } = getSupabaseRuntimeInfo();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing for LLM Billing');
  }

  const { actorId, tenantId, requestId = 'unknown' } = options;
  const providerId = payload.provider || 'openai';
  const adapter = getProvider(providerId);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Fetch BYOK Tenant Key from Vault (Fail-closed)
  const tenantKey = await getTenantApiKey(tenantId, providerId);
  adapter.injectAuth(headers, tenantKey);

  const endpointUrl = await adapter.getEndpointUrl(payload, options);
  // 1. ATOMIC QUOTA RESERVE (Fail-closed via RPC)
  const quotaKey = `LLM_DAILY_BUDGET_${providerId.toUpperCase().replace(/-/g, '_')}`;
  const fallbackBudget = providerId === 'openai' ? 5.0 : 10.0;
  const budget = parseFloat(process.env[quotaKey] || String(fallbackBudget));
  const RESERVE_COST = 0.05; // Reserve $0.05 upfront to prevent race conditions

  let recordId: string | undefined;
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_llm_budget`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_tenant_id: tenantId,
        p_actor_id: actorId,
        p_provider: providerId,
        p_model: payload.model,
        p_request_id: requestId,
        p_reserve_cost: RESERVE_COST,
        p_daily_budget: budget
      })
    });
    
    if (!rpcRes.ok) {
       const errBody = await rpcRes.text();
       if (errBody.includes('LLM_QUOTA_EXCEEDED')) {
           throw new Error(`LLM_QUOTA_EXCEEDED: Tenant ${tenantId} exceeded daily budget of $${budget} for provider ${providerId}`);
       } else if (errBody.includes('DUPLICATE_REQUEST_ID')) {
           throw new Error(`DUPLICATE_REQUEST_ID: Request ${requestId} was already processed`);
       } else {
           throw new Error(`Rate limit RPC failed: ${rpcRes.status} ${errBody}`);
       }
    }
    
    // The RPC returns the new UUID directly
    recordId = await rpcRes.json();
  } catch (error) {
    console.error('Failed to reserve LLM quota:', error);
    throw error; // Fail-closed
  }

  // 2. Execute LLM Call
  let responseData;
  let responseStatus;
  try {
    const cleanPayload: Record<string, any> = { ...payload };
    delete cleanPayload.provider;
    delete cleanPayload.tenant_id;
    delete cleanPayload.organization_id;
    delete cleanPayload.endpointUrl;
    delete cleanPayload.tenant_binding_id;
    delete cleanPayload.lane_key;

    if (providerId === 'fal_ai') {
      const prompt = typeof cleanPayload.prompt === 'string' ? cleanPayload.prompt.trim() : '';
      if (!prompt) {
        throw new Error('FAL_IMAGE_PROMPT_MISSING: fal_ai requires a non-empty prompt');
      }

      delete cleanPayload.messages;
      delete cleanPayload.response_format;
    }
    
    let requestContract = '';
    if (providerId === 'kie_ai' && cleanPayload.size) { // size indicates it's an image generation request
      if (!adapter.getRequestContract) {
         throw new Error(`UNABLE_TO_DETERMINE_REQUEST_CONTRACT: Provider ${providerId} adapter must implement getRequestContract for image generation`);
      }
      requestContract = await adapter.getRequestContract(payload, options);

      if (requestContract === 'jobs_create_task') {
        cleanPayload.input = {
          prompt: cleanPayload.prompt,
          aspect_ratio: cleanPayload.size === '1024x1024' ? '1:1' : '16:9'
        };
        delete cleanPayload.prompt;
        delete cleanPayload.messages;
        delete cleanPayload.n;
        delete cleanPayload.size;
        // Keep cleanPayload.model intact!
      } else if (requestContract === 'legacy_generate') {
        cleanPayload.aspectRatio = cleanPayload.size === '1024x1024' ? '1:1' : '16:9';
        cleanPayload.outputFormat = "jpeg";
        cleanPayload.enableTranslation = true;
        delete cleanPayload.messages;
        delete cleanPayload.n;
        delete cleanPayload.size;
        delete cleanPayload.model; // Legacy endpoints reject the model parameter
      } else if (requestContract === 'standard_generations') {
        cleanPayload.aspectRatio = cleanPayload.size === '1024x1024' ? '1:1' : '16:9';
        cleanPayload.outputFormat = "jpeg";
        cleanPayload.enableTranslation = true;
        delete cleanPayload.messages;
        delete cleanPayload.n;
        delete cleanPayload.size;
        // Keep cleanPayload.model intact!
      } else {
        throw new Error(`UNKNOWN_REQUEST_CONTRACT: Adapter returned unsupported contract '${requestContract}'`);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000); // 75 seconds timeout

    let response;
    try {
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(cleanPayload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    responseStatus = response.status;
    responseData = await response.json();

    if (!response.ok) {
      if (recordId) await updateUsageRecord(supabaseUrl, supabaseKey, recordId, { status: 'FAILED', estimated_cost: 0 });
      throw new Error(`API Error from ${providerId}: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    // --- KIE AI ASYNC POLLING LOGIC ---
    // Either legacy outputFormat or new jobs API format
    if (providerId === 'kie_ai' && responseData.data && responseData.data.taskId && (requestContract === 'legacy_generate' || requestContract === 'jobs_create_task' || requestContract === 'standard_generations')) {
      const taskId = responseData.data.taskId;

      // If async mode is requested, return immediately without polling or parsing usage
      if (options.async) {
        return {
          async_job: true,
          provider: providerId,
          taskId: taskId,
          usage_id: recordId
        };
      }

      let pollingUrl = '';
      if (requestContract === 'legacy_generate') {
        pollingUrl = endpointUrl.replace(/\/generate$/, '/record-info') + `?taskId=${taskId}`;
      } else if (requestContract === 'jobs_create_task') {
        pollingUrl = endpointUrl.replace(/\/createTask$/, '/recordInfo') + `?taskId=${taskId}`;
      } else {
        pollingUrl = endpointUrl.replace(/\/[^/]+$/, '/recordInfo') + `?taskId=${taskId}`;
      }
      
      let isComplete = false;
      let pollCount = 0;
      let finalData = responseData;
      
      while (!isComplete && pollCount < 40) { // Max 80 seconds
        await new Promise(r => setTimeout(r, 2000)); // wait 2s
        pollCount++;
        
        const pollController = new AbortController();
        const pollTimeout = setTimeout(() => pollController.abort(), 10000); // 10s per poll
        
        let pollRes;
        try {
          pollRes = await fetch(pollingUrl, {
            method: 'GET',
            headers: { 'Authorization': headers['Authorization'] },
            signal: pollController.signal
          });
        } finally {
          clearTimeout(pollTimeout);
        }
        
        if (pollRes.ok) {
          const pollJson = await pollRes.json();
          // Assuming pollJson.data.successFlag === 1 when done, per Kie docs
          if (pollJson.data && pollJson.data.successFlag === 1 && pollJson.data.response && pollJson.data.response.resultImageUrl) {
            finalData = pollJson;
            isComplete = true;
          } else if (pollJson.data && (pollJson.data.status === 'failed' || pollJson.data.status === 'error' || pollJson.data.status === -1 || pollJson.data.successFlag === -1)) {
            throw new Error(`Kie AI async task failed: ${JSON.stringify(pollJson)}`);
          }
        }
      }
      
      if (!isComplete) {
        throw new Error(`TIMEOUT: Kie AI task ${taskId} did not complete within 80 seconds.`);
      }
      responseData = finalData;
    }
    // --- END POLLING LOGIC ---

  } catch (error: any) {
    if (!responseStatus) {
      if (recordId) await updateUsageRecord(supabaseUrl, supabaseKey, recordId, { status: 'FAILED', estimated_cost: 0 });
    }
    
    // Explicitly handle AbortError from our AbortController timeout
    if (error.name === 'AbortError') {
       const timeoutErr = new Error(`UPSTREAM_TIMEOUT: Provider ${providerId} did not respond within the 75-second safety window.`);
       (timeoutErr as any).status = 504; // Map to 504 Gateway Timeout internally
       throw timeoutErr;
    }
    
    throw error;
  }

  // 3. Parse Usage and Log (Post-execution Update)
  const usageInfo = await adapter.parseUsage(responseData, payload);
  
  if (!adapter.billingUnits.includes(usageInfo.unit)) {
    if (recordId) await updateUsageRecord(supabaseUrl, supabaseKey, recordId, { status: 'FAILED', estimated_cost: 0 });
    throw new Error(`BILLING_CONTRACT_VIOLATION: Adapter ${adapter.id} returned unit '${usageInfo.unit}' but contract only allows '${adapter.billingUnits.join(', ')}'`);
  }

  if (recordId) {
    if (usageInfo.pricing_missing) {
       console.warn(`[BILLING WARNING] Provider ${providerId} model ${payload.model} is missing pricing configuration. Billed $0 to avoid blocking the workflow. This is undercharging the tenant and must be fixed in integration_providers.public_metadata!`);
    }

    await updateUsageRecord(supabaseUrl, supabaseKey, recordId, {
      prompt_tokens: usageInfo.promptTokens,
      completion_tokens: usageInfo.completionTokens,
      total_tokens: usageInfo.totalTokens,
      estimated_cost: usageInfo.estimatedCost,
      status: 'COMPLETED',
      pricing_missing: usageInfo.pricing_missing,
      pricing_missing_reason: usageInfo.pricing_missing_reason
    });
    
    // Phase 10: Double-write to the new governed ai_token_ledger
    const ledgerRes = await fetch(`${supabaseUrl}/rest/v1/ai_token_ledger`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        organization_id: tenantId,
        provider_code: providerId,
        model_used: payload.model,
        workflow_run_id: requestId,
        unit: usageInfo.unit,
        prompt_tokens: usageInfo.promptTokens,
        completion_tokens: usageInfo.completionTokens,
        total_tokens: usageInfo.totalTokens,
        estimated_cost_usd: usageInfo.estimatedCost,
        pricing_missing: usageInfo.pricing_missing || false,
        pricing_missing_reason: usageInfo.pricing_missing_reason || null
      })
    });
    
    if (!ledgerRes.ok) {
       const errBody = await ledgerRes.text();
       throw new Error(`PHASE10_LEDGER_INSERT_FAILED: ${ledgerRes.status} ${errBody}`);
    }
  }
  // Transform Kie AI image response to match OpenAI schema so downstream N8N nodes don't break
  if (providerId === 'kie_ai' && payload.size) {
     let imageUrl = null;
     
     // Case 1: Images at root level
     if (responseData.images && Array.isArray(responseData.images) && responseData.images.length > 0) {
        imageUrl = typeof responseData.images[0] === 'string' ? responseData.images[0] : responseData.images[0].url;
     } else if (responseData.output && Array.isArray(responseData.output) && responseData.output.length > 0) {
        imageUrl = typeof responseData.output[0] === 'string' ? responseData.output[0] : responseData.output[0].url;
     } else if (responseData.url) {
        imageUrl = responseData.url;
     } 
     // Case 2: Images nested inside data object (from async polling per Kie docs)
     else if (responseData.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
        if (responseData.data.response && responseData.data.response.resultImageUrl) {
           imageUrl = responseData.data.response.resultImageUrl;
        } else if (responseData.data.images && Array.isArray(responseData.data.images) && responseData.data.images.length > 0) {
           imageUrl = typeof responseData.data.images[0] === 'string' ? responseData.data.images[0] : responseData.data.images[0].url;
        } else if (responseData.data.url) {
           imageUrl = responseData.data.url;
        }
     }
     
     if (imageUrl) {
        responseData.data = [ { url: imageUrl } ];
        // Also remove nested data fields to prevent downstream confusion
        delete responseData.images;
        delete responseData.output;
     }
  }

  return responseData;
}

// Helper to UPDATE phase2_llm_usage row via RPC
async function updateUsageRecord(supabaseUrl: string, supabaseKey: string, recordId: string, updates: any) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/finalize_llm_usage`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_record_id: recordId,
        p_status: updates.status,
        p_prompt_tokens: updates.prompt_tokens || 0,
        p_completion_tokens: updates.completion_tokens || 0,
        p_total_tokens: updates.total_tokens || 0,
        p_estimated_cost: updates.estimated_cost || 0,
        p_pricing_missing: updates.pricing_missing || false,
        p_pricing_missing_reason: updates.pricing_missing_reason || null
      })
    });
  } catch (e) {
    console.error('Failed to update LLM usage record:', e);
  }
}
