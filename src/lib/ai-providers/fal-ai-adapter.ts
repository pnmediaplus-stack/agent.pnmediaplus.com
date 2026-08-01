import { AiProviderAdapter, UsageInfo } from './index';

// Fal.ai cost map
const FAL_PRICING: Record<string, { per_unit: number, type: 'seconds' | 'megapixel' | 'flat' }> = {
  'fal-ai/fast-svd': { per_unit: 0.05, type: 'flat' }, 
  'fal-ai/flux/dev': { per_unit: 0.035, type: 'megapixel' }, 
  'default': { per_unit: 0.05, type: 'flat' }
};

export const falAiAdapter: AiProviderAdapter = {
  id: 'fal-ai',
  billingUnits: ['seconds', 'requests', 'images'],
  
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
    const pricing = FAL_PRICING[payload.model] || FAL_PRICING['default'];
    let estimatedCost = 0;
    let unit: 'seconds' | 'requests' | 'images' | 'tokens' = 'requests';
    let totalTokens = 1;

    if (pricing.type === 'megapixel') {
       if (!responseJson.images || !responseJson.images[0] || !responseJson.images[0].width) {
          throw new Error('UNABLE_TO_PARSE_FAL_USAGE: Megapixel metering failed. No valid image dimensions found in response.');
       }
       const img = responseJson.images[0];
       const megapixels = (img.width * img.height) / 1_000_000;
       estimatedCost = megapixels * pricing.per_unit;
       unit = 'images';
    } else if (pricing.type === 'seconds') {
       if (!responseJson.metrics || typeof responseJson.metrics.inference_time !== 'number') {
          throw new Error('UNABLE_TO_PARSE_FAL_USAGE: Seconds metering failed. Response format missing metrics.inference_time');
       }
       const durationSeconds = responseJson.metrics.inference_time; 
       estimatedCost = durationSeconds * pricing.per_unit;
       unit = 'seconds';
       totalTokens = Math.ceil(durationSeconds);
    } else {
       // Flat rate
       estimatedCost = pricing.per_unit;
       unit = 'requests';
    }

    return {
      unit,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens,
      estimatedCost
    };
  }
};
