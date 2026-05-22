export type VaultActorType = "HUMAN" | "SYSTEM" | "N8N" | "SERVICE";

export type ByokBrokerEnvelope<TData = unknown> = {
  ok: boolean;
  route: "byok-reference-token" | "byok-llm-proxy";
  status: number;
  message: string;
  data?: TData;
  error?: string;
  receivedAt: string;
};

export type ByokIssueTokenRequest = {
  credential_ref?: string;
  scope?: string;
  actor_type?: string;
  actor_external_ref?: string;
  expires_at?: string;
};

export type ByokLlmProxyRequest = {
  reference_token?: string;
  provider?: "openai";
  model?: string;
  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  actor_type?: string;
  actor_external_ref?: string;
};
