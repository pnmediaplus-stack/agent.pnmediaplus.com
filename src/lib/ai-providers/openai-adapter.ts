import { AiProviderAdapter, UsageInfo } from './index';

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

export const openaiAdapter: AiProviderAdapter = {
  id: 'openai',
  billingUnits: ['tokens', 'images'],
  
  getEndpointUrl: async (payload: any, options: { endpointUrl?: string }): Promise<string> => {
    if (options.endpointUrl) return options.endpointUrl;
    const metadata = await getProviderMetadata('openai');
    const models = metadata?.models || [];
    const modelConfig = models.find((m: any) => m.code === payload.model);
    
    if (modelConfig && modelConfig.endpoint) {
      return modelConfig.endpoint;
    }

    // Fail-closed instead of guessing dall-e or gpt-image
    throw new Error(`UNABLE_TO_DETERMINE_ENDPOINT: Model '${payload.model}' does not have an endpoint configured in integration_providers.public_metadata.`);
  },

  injectAuth: (headers: Record<string, string>, tenantKey?: string) => {
    const key = tenantKey || process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error('OPENAI_API_KEY is missing');
    headers['Authorization'] = `Bearer ${key}`;
  },

  parseUsage: async (responseJson: any, payload: any): Promise<UsageInfo> => {
    // For Chat Completions
    if (responseJson.usage) {
      const promptTokens = responseJson.usage.prompt_tokens || 0;
      const completionTokens = responseJson.usage.completion_tokens || 0;
      const totalTokens = responseJson.usage.total_tokens || 0;
      
      const metadata = await getProviderMetadata('openai');
      const models = metadata?.models || [];
      const modelConfig = models.find((m: any) => m.code === payload.model);
      
      if (!modelConfig || modelConfig.prompt_cost === undefined || modelConfig.completion_cost === undefined) {
         throw new Error(`CONFIG_MISSING: Pricing for model '${payload.model}' is missing in integration_providers.public_metadata.`);
      }
      
      const estimatedCost = (promptTokens / 1_000_000) * modelConfig.prompt_cost + (completionTokens / 1_000_000) * modelConfig.completion_cost;

      return {
        unit: 'tokens',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost
      };
    }
    
    // For Image Generations (DALL-E usually doesn't return `usage` field, cost is per image)
    if (responseJson.data && Array.isArray(responseJson.data)) {
      const imageCount = responseJson.data.length;
      const metadata = await getProviderMetadata('openai');
      const models = metadata?.models || [];
      const modelConfig = models.find((m: any) => m.code === payload.model);
      
      if (!modelConfig || modelConfig.completion_cost === undefined) {
         throw new Error(`CONFIG_MISSING: Pricing for image model '${payload.model}' is missing in integration_providers.public_metadata.`);
      }
      
      const estimatedCost = (imageCount / 1000) * modelConfig.completion_cost; // Normalized to per 1k

      return {
        unit: 'images',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: imageCount, // Treat totalTokens as image count in the ledger
        estimatedCost
      };
    }

    // Fail-closed
    throw new Error('UNABLE_TO_PARSE_OPENAI_USAGE: Response format unrecognized or usage missing.');
  }
};
