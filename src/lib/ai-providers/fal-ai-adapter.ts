import { AiProviderAdapter, UsageInfo } from './index';

// Fal.ai cost map (approximate cost per megapixel or second)
const FAL_PRICING: Record<string, { per_unit: number }> = {
  'fal-ai/fast-svd': { per_unit: 0.05 }, // Example: 0.05 USD per run
  'fal-ai/flux/dev': { per_unit: 0.035 }, // Example: 0.035 USD per megapixel
  'default': { per_unit: 0.05 }
};

export const falAiAdapter: AiProviderAdapter = {
  id: 'fal-ai',
  billingUnit: 'seconds',
  
  getEndpointUrl: (payload: any, options: { endpointUrl?: string }) => {
    if (options.endpointUrl) return options.endpointUrl;
    if (!payload.model) throw new Error('Fal.ai requires a model identifier in the payload (e.g., fal-ai/fast-svd)');
    return `https://fal.run/${payload.model}`;
  },

  injectAuth: (headers: Record<string, string>, tenantKey?: string) => {
    const key = tenantKey || process.env.FAL_KEY?.trim();
    if (!key) throw new Error('FAL_KEY is missing');
    headers['Authorization'] = `Key ${key}`;
  },

  parseUsage: (responseJson: any, payload: any): UsageInfo => {
    // strict parsing
    if (!responseJson.metrics || typeof responseJson.metrics.inference_time !== 'number') {
       throw new Error('UNABLE_TO_PARSE_FAL_USAGE: Response format missing metrics.inference_time');
    }

    const durationSeconds = responseJson.metrics.inference_time; 

    const pricing = FAL_PRICING[payload.model] || FAL_PRICING['default'];
    // Actual metering based on real usage!
    const estimatedCost = durationSeconds * pricing.per_unit;

    return {
      unit: 'seconds',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: Math.ceil(durationSeconds), // Store rounded seconds as tokens in ledger for visibility
      estimatedCost
    };
  }
};
