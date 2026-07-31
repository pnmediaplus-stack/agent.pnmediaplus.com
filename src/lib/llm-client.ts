import { z } from 'zod';

export type LlmClientOptions = {
  actorId: string;
  tenantId: string;
  requestId?: string;
  endpointUrl?: string; // e.g. https://api.openai.com/v1/images/generations
};

export type LlmPayload = {
  model: string;
  [key: string]: any;
};

// Default Daily Quota if not configured
const DEFAULT_DAILY_QUOTA = 100000;

export async function invokeLlm(payload: LlmPayload, options: LlmClientOptions) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiUrl = options.endpointUrl || (process.env.BYOK_OPENAI_CHAT_COMPLETIONS_URL || 'https://api.openai.com/v1/chat/completions').trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing for LLM Billing');
  }

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const { actorId, tenantId, requestId = 'unknown' } = options;

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  // 1. Rate Limit Check (Pre-execution)
  // We query the daily usage view by tenant_id
  try {
    const usageRes = await fetch(`${supabaseUrl}/rest/v1/phase2_llm_usage_daily?tenant_id=eq.${encodeURIComponent(tenantId)}&select=daily_tokens`, {
      headers
    });
    
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      const currentUsage = usageData.length > 0 ? (usageData[0].daily_tokens || 0) : 0;
      
      const quota = parseInt(process.env.LLM_DAILY_QUOTA || String(DEFAULT_DAILY_QUOTA), 10);
      if (currentUsage >= quota) {
        // FAIL-CLOSED: Log blocked request
        await logUsage({
          supabaseUrl, supabaseKey, tenantId, actorId, 
          provider: 'openai', model: payload.model, requestId,
          promptTokens: 0, completionTokens: 0, totalTokens: 0,
          status: 'BLOCKED'
        });
        throw new Error(`LLM_QUOTA_EXCEEDED: Tenant ${tenantId} exceeded daily quota of ${quota} tokens`);
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
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    responseStatus = response.status;
    responseData = await response.json();

    if (!response.ok) {
      // Log failure
      await logUsage({
        supabaseUrl, supabaseKey, tenantId, actorId,
        provider: 'openai', model: payload.model, requestId,
        promptTokens: 0, completionTokens: 0, totalTokens: 0,
        status: 'FAILED'
      });
      throw new Error(`OpenAI API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

  } catch (error: any) {
    if (!responseStatus) {
      // Network error before response
      await logUsage({
        supabaseUrl, supabaseKey, tenantId, actorId,
        provider: 'openai', model: payload.model, requestId,
        promptTokens: 0, completionTokens: 0, totalTokens: 0,
        status: 'FAILED'
      });
    }
    throw error;
  }

  // 3. Parse Usage and Log (Post-execution)
  let promptTokens = responseData.usage?.prompt_tokens || 0;
  let completionTokens = responseData.usage?.completion_tokens || 0;
  let totalTokens = responseData.usage?.total_tokens || 0;
  let estimatedCost = 0;
  
  if (payload.model.includes('dall-e')) {
    // Synthetic billing for images: dall-e-3 standard 1024x1024 costs ~$0.040
    // To normalize with token rate limits, we assign a heavy token equivalent.
    // 0.040 is equivalent to ~25,000 input tokens of GPT-4o-mini
    totalTokens = 25000;
    promptTokens = 25000;
    estimatedCost = 0.040;
  } else {
    // Very rough estimate for standard models (cost per 1k tokens)
    estimatedCost = (promptTokens * 0.00015) + (completionTokens * 0.0006);
  }

  await logUsage({
    supabaseUrl, supabaseKey, tenantId, actorId,
    provider: 'openai', model: payload.model, requestId,
    promptTokens, completionTokens, totalTokens,
    estimatedCost, status: 'COMPLETED'
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
