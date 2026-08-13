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
  getEndpointUrl: (payload: any, options: { endpointUrl?: string }) => Promise<string> | string;
  injectAuth: (headers: Record<string, string>, tenantKey?: string) => void;
  parseUsage: (responseJson: any, payload: any) => Promise<UsageInfo> | UsageInfo;
}

// Registry Whitelist
import { openaiAdapter } from './openai-adapter';
import { falAiAdapter } from './fal-ai-adapter';

export const AI_PROVIDERS: Record<string, AiProviderAdapter> = {
  'openai': openaiAdapter,
  'fal_ai': falAiAdapter,
};

export function getProvider(providerId: string): AiProviderAdapter {
  const normalizedProviderId = typeof providerId === 'string' ? providerId.trim() : '';

  if (!normalizedProviderId) {
    throw new Error('PROVIDER_NOT_SUPPORTED: providerId is required.');
  }

  const provider = AI_PROVIDERS[normalizedProviderId];
  if (!provider) {
    throw new Error(`PROVIDER_NOT_SUPPORTED: Provider '${normalizedProviderId}' is not registered.`);
  }

  return provider;
}
