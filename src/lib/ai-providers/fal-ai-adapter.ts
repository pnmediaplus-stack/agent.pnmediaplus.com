import { AiProviderAdapter, UsageInfo } from './index';

// Fal.ai cost map (approximate cost per megapixel or second)
const FAL_PRICING: Record<string, { per_unit: number }> = {
  'fal-ai/fast-svd': { per_unit: 0.05 }, // Example: 0.05 USD per run
  'fal-ai/flux/dev': { per_unit: 0.035 }, // Example: 0.035 USD per megapixel
  'default': { per_unit: 0.05 }
};

export const falAiAdapter: AiProviderAdapter = {
  id: 'fal-ai',
  
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
    // Fal.ai usually returns pricing/usage info in headers, but for API responses 
    // it depends on the endpoint. If they don't return usage in JSON, we charge a flat rate based on the model.
    // However, Gatekeeper mandated strict parsing. Let's try to parse `has_nsfw_concepts` or `images` to verify it ran.
    
    // Some fal APIs return a `metrics` object with `inference_time`
    const durationSeconds = responseJson.metrics?.inference_time || 1; 

    // Verify it actually succeeded by checking if there's an image or video output
    if (!responseJson.images && !responseJson.video) {
       throw new Error('UNABLE_TO_PARSE_FAL_USAGE: Response format unrecognized. No images or video returned.');
    }

    const pricing = FAL_PRICING[payload.model] || FAL_PRICING['default'];
    const estimatedCost = pricing.per_unit;

    return {
      unit: 'requests',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 1, // Treat totalTokens as request count
      estimatedCost
    };
  }
};
