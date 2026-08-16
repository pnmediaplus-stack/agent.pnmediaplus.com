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
        if (payload.model === 'flux-kontext-pro') {
          return `${base}/api/v1/flux/kontext/generate`;
        }
        // Fallback for other flux models if any
        if (payload.model.includes('flux')) {
          const subPath = payload.model.replace('flux-', '').replace('-pro', '');
          return `${base}/api/v1/flux/${subPath}/generate`;
        }
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
    
    // For Image Generations
    if (payload.model?.includes('flux') || (responseJson.data && Array.isArray(responseJson.data)) || responseJson.images || responseJson.output) {
      let imageCount = 1;
      if (responseJson.data && Array.isArray(responseJson.data)) imageCount = responseJson.data.length;
      else if (responseJson.images && Array.isArray(responseJson.images)) imageCount = responseJson.images.length;
      else if (responseJson.output && Array.isArray(responseJson.output)) imageCount = responseJson.output.length;
      const metadata = await getProviderMetadata('kie_ai');
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
        totalTokens: imageCount,
        estimatedCost
      };
    }

    // Fail-closed
    throw new Error('UNABLE_TO_PARSE_KIE_AI_USAGE: Response format unrecognized or usage missing.');
  }
};
