export interface UsageInfo {
  unit: 'tokens' | 'seconds' | 'images' | 'requests';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // The universal metric for the ledger
}

export interface AiProviderAdapter {
  id: string;
  billingUnits: ('tokens' | 'seconds' | 'images' | 'requests')[];
  getEndpointUrl: (payload: any, options: { endpointUrl?: string }) => string;
  injectAuth: (headers: Record<string, string>, tenantKey?: string) => void;
  parseUsage: (responseJson: any, payload: any) => UsageInfo;
}

// Registry Whitelist
import { openaiAdapter } from './openai-adapter';
import { falAiAdapter } from './fal-ai-adapter';

export const AI_PROVIDERS: Record<string, AiProviderAdapter> = {
  'openai': openaiAdapter,
  'fal-ai': falAiAdapter,
};

export function getProvider(providerId: string): AiProviderAdapter {
  const provider = AI_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`PROVIDER_NOT_SUPPORTED: The provider '${providerId}' is not configured in the strict whitelist.`);
  }
  return provider;
}
