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
    
    const baseUrl = metadata?.base_url ? metadata.base_url.replace(/\/$/, '') : 'https://api.kie.ai/v1';

    let finalEndpoint = '';
    if (modelConfig && modelConfig.endpoint_template) {
      finalEndpoint = modelConfig.endpoint_template.replace('{model}', payload.model);
    } else if (modelConfig && modelConfig.endpoint) {
      finalEndpoint = modelConfig.endpoint;
    }

    if (finalEndpoint) {
      if (finalEndpoint.startsWith('http')) return finalEndpoint;
      if (finalEndpoint.startsWith('/')) return `${baseUrl}${finalEndpoint}`;
      return `${baseUrl}/${finalEndpoint}`;
    }

    // Fail-closed instead of guessing dall-e or gpt-image
    throw new Error(`UNABLE_TO_DETERMINE_ENDPOINT: Model '${payload.model}' does not have an endpoint configured in integration_providers.public_metadata.`);
  },

  getRequestContract: async (payload: any, options: any): Promise<string> => {
    const metadata = await getProviderMetadata('kie_ai');
    const models = metadata?.models || [];
    const modelConfig = models.find((m: any) => m.code === payload.model);
    
    // Explicit contract from metadata
    if (modelConfig && modelConfig.request_contract) {
        return modelConfig.request_contract;
    }
    
    throw new Error(
      `UNABLE_TO_DETERMINE_REQUEST_CONTRACT: Model '${payload.model}' does not have request_contract configured in integration_providers.public_metadata.`
    );
  },

  getPollingUrl: async (payload: any, options: any, taskId: string): Promise<string> => {
    const metadata = await getProviderMetadata('kie_ai');
    const pollPath = metadata?.poll_path?.trim();
    if (!pollPath) {
      throw new Error(`UNABLE_TO_DETERMINE_POLL_PATH: Provider 'kie_ai' does not have poll_path configured in integration_providers.public_metadata.`);
    }
    const baseUrl = metadata.base_url ? metadata.base_url.replace(/\/$/, '') : 'https://api.kie.ai/v1';
    const normalizedPollPath = pollPath.startsWith('/') ? pollPath : `/${pollPath}`;
    const apiBaseUrl = baseUrl.includes('/api/v1') ? baseUrl : baseUrl.replace('/v1', '/api/v1');
    return `${apiBaseUrl}${normalizedPollPath}?taskId=${taskId}`;
  },

  injectAuth: (headers: Record<string, string>, tenantKey?: string) => {
    if (!tenantKey) throw new Error('VAULT_CREDENTIAL_NOT_READY: KIE_AI_API_KEY is missing');
    headers['Authorization'] = `Bearer ${tenantKey}`;
  },

  parseUsage: async (responseJson: any, payload: any): Promise<UsageInfo> => {
    const metadata = await getProviderMetadata('kie_ai');
    const models = metadata?.models || [];
    const modelConfig = models.find((m: any) => m.code === payload.model);

    if (modelConfig?.capability === 'text') {
      if (!responseJson.usage) {
        throw new Error('UNABLE_TO_PARSE_KIE_AI_USAGE: Text response is missing usage metadata.');
      }

      const promptTokens = responseJson.usage.prompt_tokens || 0;
      const completionTokens = responseJson.usage.completion_tokens || 0;
      const totalTokens = responseJson.usage.total_tokens || 0;
      
      // Fallback to 0 cost if pricing is missing to prevent workflow crashes, but mark it
      const isPricingMissing = modelConfig?.prompt_cost === undefined || modelConfig?.completion_cost === undefined;
      const promptCost = !isPricingMissing ? modelConfig.prompt_cost : 0;
      const completionCost = !isPricingMissing ? modelConfig.completion_cost : 0;
      
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
    
    if (modelConfig?.capability === 'image') {
      let imageCount = 1;
      if (responseJson.data && Array.isArray(responseJson.data)) {
        imageCount = responseJson.data.length;
      } else if (responseJson.data && responseJson.data.successFlag !== undefined) {
        // Unified Jobs API returns an object, we assume 1 image per job as per payload
        imageCount = payload.n || 1;
      } else {
        throw new Error('UNABLE_TO_PARSE_KIE_AI_USAGE: Image response is missing the expected data array or unified job shape.');
      }
      
      
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
