import { AiProviderAdapter, UsageInfo } from './index';

// OpenAI cost map (approximate cost per 1M tokens in USD)
// Update these to match real pricing if needed
const OPENAI_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o': { prompt: 5.0, completion: 15.0 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
  'dall-e-3': { prompt: 40.0, completion: 40.0 }, // per 1k images for simplicity
  'default': { prompt: 5.0, completion: 15.0 }
};

export const openaiAdapter: AiProviderAdapter = {
  id: 'openai',
  
  getEndpointUrl: (payload: any, options: { endpointUrl?: string }) => {
    if (options.endpointUrl) return options.endpointUrl;
    if (payload.model?.includes('dall-e')) {
      return process.env.BYOK_OPENAI_IMAGES_URL || 'https://api.openai.com/v1/images/generations';
    }
    return process.env.BYOK_OPENAI_CHAT_COMPLETIONS_URL || 'https://api.openai.com/v1/chat/completions';
  },

  injectAuth: (headers: Record<string, string>, tenantKey?: string) => {
    const key = tenantKey || process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error('OPENAI_API_KEY is missing');
    headers['Authorization'] = `Bearer ${key}`;
  },

  parseUsage: (responseJson: any, payload: any): UsageInfo => {
    // For Chat Completions
    if (responseJson.usage) {
      const promptTokens = responseJson.usage.prompt_tokens || 0;
      const completionTokens = responseJson.usage.completion_tokens || 0;
      const totalTokens = responseJson.usage.total_tokens || 0;
      
      const pricing = OPENAI_PRICING[payload.model] || OPENAI_PRICING['default'];
      const estimatedCost = (promptTokens / 1_000_000) * pricing.prompt + (completionTokens / 1_000_000) * pricing.completion;

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
      const pricing = OPENAI_PRICING[payload.model] || OPENAI_PRICING['dall-e-3'];
      const estimatedCost = (imageCount / 1000) * pricing.completion; // Normalized to per 1k

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
