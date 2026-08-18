import type { AiProviderAdapter, UsageInfo } from './index';

async function getProviderMetadata(providerId: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) return null;
  
  const res = await fetch(`${supabaseUrl}/rest/v1/phase070_integration_provider_catalog?provider_code=eq.${providerId}&select=public_metadata`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (!res.ok) return null;
  const json = await res.json();
  return json[0]?.public_metadata;
}

export const kieAiAdapter: AiProviderAdapter = {
  id: 'kie_ai',
  billingUnits: ['tokens', 'images'],
  
  getEndpointUrl: async (payload: any, options: { endpointUrl?: string }): Promise<string> => {
    if (options.endpointUrl) return options.endpointUrl;
    const metadata = await getProviderMetadata('kie_ai');
    const models = metadata?.models || [];
    const modelConfig = models.find((m: any) => m.code === payload.model);
    
    if (modelConfig && modelConfig.endpoint_template) {
      return modelConfig.endpoint_template.replace('{model}', payload.model);
    }
    if (modelConfig && modelConfig.endpoint) {
      return modelConfig.endpoint;
    }

    if (modelConfig) {
      const baseUrl = metadata?.base_url || 'https://api.kie.ai/v1'; // Default base URL for Kie if none is set
      if (modelConfig.capability === 'text') {
        return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      }
      if (modelConfig.capability === 'image') {
        const base = baseUrl.replace(/\/v1$/, '').replace(/\/$/, ''); // Remove /v1 if present so we can use /api/v1
        return `${base}/api/v1/images/generations`;
      }
    }

    // Fail-closed instead of guessing dall-e or gpt-image
    throw new Error(`UNABLE_TO_DETERMINE_ENDPOINT: Model '${payload.model}' does not have an endpoint configured in integration_providers.public_metadata.`);
  },

  injectAuth: (headers: Record<string, string>, tenantKey?: string) => {
    if (!tenantKey) throw new Error('VAULT_CREDENTIAL_NOT_READY: KIE_AI_API_KEY is missing');
    headers['Authorization'] = `Bearer ${tenantKey}`;
  },

  parseUsage: async (responseJson: any, payload: any): Promise<UsageInfo> => {
    // For Chat Completions
    if (responseJson.usage) {
      const promptTokens = responseJson.usage.prompt_tokens || 0;
      const completionTokens = responseJson.usage.completion_tokens || 0;
      const totalTokens = responseJson.usage.total_tokens || 0;
      
      const metadata = await getProviderMetadata('kie_ai');
      const models = metadata?.models || [];
      const modelConfig = models.find((m: any) => m.code === payload.model);
      
      const promptCost = modelConfig?.prompt_cost !== undefined ? modelConfig.prompt_cost : 0;
      const completionCost = modelConfig?.completion_cost !== undefined ? modelConfig.completion_cost : 0;
      const isPricingMissing = modelConfig?.prompt_cost === undefined || modelConfig?.completion_cost === undefined;
      
      const estimatedCost = (promptTokens / 1_000_000) * promptCost + (completionTokens / 1_000_000) * completionCost;

      return {
        unit: 'tokens',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        ...(isPricingMissing ? { pricing_missing: true, pricing_missing_reason: 'MISSING_TEXT_PRICING' } : {})
      };
    }
    
    // For Image Generations
    if (payload.model?.includes('flux') || (responseJson.data && responseJson.data.response && responseJson.data.response.resultImageUrl) || (responseJson.data && Array.isArray(responseJson.data)) || responseJson.images || responseJson.output) {
      let imageCount = 1;
      if (responseJson.data && Array.isArray(responseJson.data)) imageCount = responseJson.data.length;
      else if (responseJson.images && Array.isArray(responseJson.images)) imageCount = responseJson.images.length;
      else if (responseJson.output && Array.isArray(responseJson.output)) imageCount = responseJson.output.length;
      const metadata = await getProviderMetadata('kie_ai');
      const models = metadata?.models || [];
      const modelConfig = models.find((m: any) => m.code === payload.model);
      
      // Fallback to 0 cost if pricing is missing to prevent workflow crashes, but mark it
      const isPricingMissing = modelConfig?.completion_cost === undefined;
      const completionCost = !isPricingMissing ? modelConfig.completion_cost : 0;
      
      const estimatedCost = (imageCount / 1000) * completionCost; // Normalized to per 1k

      return {
        unit: 'images',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: imageCount,
        estimatedCost,
        ...(isPricingMissing ? { pricing_missing: true, pricing_missing_reason: 'MISSING_IMAGE_PRICING' } : {})
      };
    }

    // Fail-closed
    throw new Error('UNABLE_TO_PARSE_KIE_AI_USAGE: Response format unrecognized or usage missing.');
  }
};
