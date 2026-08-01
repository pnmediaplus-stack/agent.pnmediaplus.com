import { z } from 'zod';
import { getProvider } from './ai-providers';

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

  // Inject Provider-specific Auth
  // Note: tenantKey support for BYOK would go here (fetching from tenant_integrations)
  adapter.injectAuth(headers);

  const endpointUrl = adapter.getEndpointUrl(payload, options);

  // 1. Rate Limit Check (Pre-execution)
  // We query the daily usage view by tenant_id
  try {
    const usageRes = await fetch(`${supabaseUrl}/rest/v1/phase2_llm_usage_daily?tenant_id=eq.${encodeURIComponent(tenantId)}&select=daily_tokens`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      const currentUsage = usageData.length > 0 ? (usageData[0].daily_tokens || 0) : 0;
      
      const quota = parseInt(process.env.LLM_DAILY_QUOTA || String(DEFAULT_DAILY_QUOTA), 10);
      if (currentUsage >= quota) {
        // FAIL-CLOSED: Log blocked request
        await logUsage({
          supabaseUrl, supabaseKey, tenantId, actorId, 
          provider: providerId, model: payload.model, requestId,
          promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0,
          status: 'BLOCKED'
        });
        throw new Error(`LLM_QUOTA_EXCEEDED: Tenant ${tenantId} exceeded daily quota of ${quota} tokens (or equivalent estimated cost)`);
      }
    } else {
      // If the table/view doesn't exist yet, we still fail-closed!
      console.error(`Rate limit check failed. Status: ${usageRes.status}`);
      throw new Error('Rate limit check failed to read from DB (Fail-closed)');
    }
  } catch (error) {
    throw error; // Let it fail-closed
  }

  // 2. Execute LLM Call
  let responseData;
  let responseStatus;
  try {
    // Clean payload for provider
    const cleanPayload = { ...payload };
    delete cleanPayload.provider;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(cleanPayload)
    });

    responseStatus = response.status;
    responseData = await response.json();

    if (!response.ok) {
      // Log failure
      await logUsage({
        supabaseUrl, supabaseKey, tenantId, actorId,
        provider: providerId, model: payload.model, requestId,
        promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0,
        status: 'FAILED'
      });
      throw new Error(`API Error from ${providerId}: ${response.status} - ${JSON.stringify(responseData)}`);
    }

  } catch (error: any) {
    if (!responseStatus) {
      // Network error before response
      await logUsage({
        supabaseUrl, supabaseKey, tenantId, actorId,
        provider: providerId, model: payload.model, requestId,
        promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0,
        status: 'FAILED'
      });
    }
    throw error;
  }

  // 3. Parse Usage and Log (Post-execution)
  // Adapter MUST parse usage strictly. If it fails, it throws, ensuring fail-closed billing tracking!
  const usageInfo = adapter.parseUsage(responseData, payload);

  await logUsage({
    supabaseUrl, supabaseKey, tenantId, actorId,
    provider: providerId, model: payload.model, requestId,
    promptTokens: usageInfo.promptTokens, 
    completionTokens: usageInfo.completionTokens, 
    totalTokens: usageInfo.totalTokens,
    estimatedCost: usageInfo.estimatedCost, 
    status: 'COMPLETED'
  });

  return responseData;
}

// Helper to write to phase2_llm_usage
async function logUsage(args: {
  supabaseUrl: string;
  supabaseKey: string;
  tenantId: string;
  actorId: string;
  provider: string;
  model: string;
  requestId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  status: string;
}) {
  try {
    await fetch(`${args.supabaseUrl}/rest/v1/phase2_llm_usage`, {
      method: 'POST',
      headers: {
        'apikey': args.supabaseKey,
        'Authorization': `Bearer ${args.supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenant_id: args.tenantId,
        actor_id: args.actorId,
        provider: args.provider,
        model: args.model,
        request_id: args.requestId,
        prompt_tokens: args.promptTokens,
        completion_tokens: args.completionTokens,
        total_tokens: args.totalTokens,
        estimated_cost: args.estimatedCost || 0.0,
        status: args.status
      })
    });
  } catch (e) {
    console.error('Failed to write LLM usage log:', e);
  }
}
