import { z } from 'zod';
import { getProvider } from './ai-providers';
import { issueReferenceToken, redeemReferenceToken } from './byok-secret-broker';

async function getTenantApiKey(tenantId: string, providerCode: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Missing Supabase server keys.');
  }

  const { createServiceRoleClient } = await import('./supabase-server');
  const supabase = createServiceRoleClient();

  // 1. Read the authoritative runtime row directly from the private tenant vault.
  const { data: integration, error: integrationError } = await supabase
    .schema('tenant_integration_vault')
    .from('tenant_integrations')
    .select('organization_id,integration_key,status,connection_state,provider_id,vault_credential_ref,current_secret_blob_id,updated_at')
    .eq('organization_id', tenantId)
    .eq('status', 'configured')
    .eq('connection_state', 'healthy')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (integrationError) {
    throw new Error(`VAULT_CREDENTIAL_NOT_READY: Failed to query private tenant integration - ${integrationError.message}`);
  }

  if (!integration) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: No configured healthy integration found for this tenant.');
  }

  if (!integration.integration_key) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Tenant integration is missing integration_key.');
  }

  // 2. Resolve provider directly from the private runtime schema.
  const { data: provider, error: providerError } = await supabase
    .schema('tenant_integration_vault')
    .from('integration_providers')
    .select('provider_code,status')
    .eq('id', integration.provider_id)
    .single();

  if (providerError) {
    throw new Error(`VAULT_CREDENTIAL_NOT_READY: Failed to query provider row - ${providerError.message}`);
  }

  if (!provider || provider.provider_code !== providerCode) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Provider scope mismatch for configured integration.');
  }

  if (provider.status !== 'active') {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Provider is not active.');
  }

  const credentialRef = integration.vault_credential_ref;
  if (!credentialRef) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Credential reference not found in private tenant integration.');
  }

  // 3. Issue and redeem token (in-memory only, one-time use)
  const actor = { actorType: 'SYSTEM' as any, actorRef: 'llm-client' };
  const tokenReq = await issueReferenceToken({ credential_ref: credentialRef, scope: 'llm:invoke' }, actor);
  const secretData = await redeemReferenceToken(tokenReq.lease_token, tenantId, integration.integration_key, actor);
  
  if (!secretData.access_token) {
    throw new Error('VAULT_CREDENTIAL_NOT_READY: Decrypted secret is empty.');
  }

  return secretData.access_token;
}

export type LlmClientOptions = {
  actorId: string;
  tenantId: string;
  requestId?: string;
  endpointUrl?: string; // e.g. custom BYOK url
};

export type LlmPayload = {
  provider?: string; // Defaults to openai if missing
  model: string;
  [key: string]: any;
};

// Default Daily Quota if not configured
const DEFAULT_DAILY_QUOTA = 100000;

export async function invokeLlm(payload: LlmPayload, options: LlmClientOptions) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
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
    const cleanPayload = { ...payload };
    delete cleanPayload.provider;
    delete cleanPayload.tenant_id;
    delete cleanPayload.organization_id;
    delete cleanPayload.endpointUrl;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanPayload)
    });

    responseStatus = response.status;
    responseData = await response.json();

    if (!response.ok) {
      if (recordId) await updateUsageRecord(supabaseUrl, supabaseKey, recordId, { status: 'FAILED', estimated_cost: 0 });
      throw new Error(`API Error from ${providerId}: ${response.status} - ${JSON.stringify(responseData)}`);
    }

  } catch (error: any) {
    if (!responseStatus) {
      if (recordId) await updateUsageRecord(supabaseUrl, supabaseKey, recordId, { status: 'FAILED', estimated_cost: 0 });
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
    await updateUsageRecord(supabaseUrl, supabaseKey, recordId, {
      prompt_tokens: usageInfo.promptTokens,
      completion_tokens: usageInfo.completionTokens,
      total_tokens: usageInfo.totalTokens,
      estimated_cost: usageInfo.estimatedCost,
      status: 'COMPLETED'
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
        estimated_cost_usd: usageInfo.estimatedCost
      })
    });
    
    if (!ledgerRes.ok) {
       const errBody = await ledgerRes.text();
       throw new Error(`PHASE10_LEDGER_INSERT_FAILED: ${ledgerRes.status} ${errBody}`);
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
        p_estimated_cost: updates.estimated_cost || 0
      })
    });
  } catch (e) {
    console.error('Failed to update LLM usage log:', e);
  }
}
