import "server-only";

import { createDecipheriv, createHash } from "node:crypto";
import {
  readControlPlaneSessionCookie,
  verifyControlPlaneSessionCookieValue
} from "@/lib/control-plane-session";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type {
  ByokBrokerEnvelope,
  ByokIssueTokenRequest,
  ByokLlmProxyRequest,
  VaultActorType
} from "@/types/byok";

const BYOK_RPC_SCHEMA = "public";

type BrokerActor = {
  actorType: VaultActorType;
  actorRef: string;
};

type SupabaseVaultConfig = {
  url: string;
  serviceRoleKey: string;
};

type IssueReferenceTokenRow = {
  jti: string;
  lease_token: string;
  expires_at: string;
  broker_receipt_ref: string;
};

type ConsumeReferenceTokenRow = {
  credential_ref: string;
  scope: string;
  expires_at: string;
  master_key_ref: string;
  master_key_version: number;
  secret_blob_id: string;
  ciphertext: string;
  ciphertext_nonce?: string | null;
  broker_receipt_ref: string;
  request_id?: string;
};

type VaultMasterKeysEnv = {
  active: string;
  keys: Record<string, string>;
};

type VaultCipherPackage = {
  version: string;
  iv: Buffer;
  ciphertext: Buffer;
  authTag: Buffer;
};

export class ByokBrokerError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ByokBrokerError";
    this.status = status;
    this.code = code;
  }
}

export function byokEnvelope<TData>(
  route: ByokBrokerEnvelope<TData>["route"],
  status: number,
  message: string,
  data?: TData,
  error?: string
): ByokBrokerEnvelope<TData> {
  return {
    ok: status >= 200 && status < 300,
    route,
    status,
    message,
    ...(data === undefined ? {} : { data }),
    ...(error ? { error } : {}),
    receivedAt: new Date().toISOString()
  };
}

function getSupabaseVaultConfig(): SupabaseVaultConfig {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !serviceRoleKey) {
    throw new ByokBrokerError(
      503,
      "VAULT_SUPABASE_ENV_MISSING",
      "BYOK broker is fail-closed because Supabase service role vault env is missing."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey
  };
}

function sanitizeIdentifier(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isLlmScope(scope: string) {
  return scope === "llm" || scope.startsWith("llm:");
}

function normalizeActorType(value: string | undefined, fallback: VaultActorType): VaultActorType {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "HUMAN" || normalized === "SYSTEM" || normalized === "N8N" || normalized === "SERVICE") {
    return normalized;
  }

  return fallback;
}

async function authorizeHumanRequest(headers: Headers, payload: ByokIssueTokenRequest | ByokLlmProxyRequest): Promise<BrokerActor> {
  const sessionValue = readControlPlaneSessionCookie(headers);
  if (!sessionValue) {
    throw new ByokBrokerError(401, "MISSING_CONTROL_PLANE_SESSION", "Control plane session cookie is required.");
  }

  const session = await verifyControlPlaneSessionCookieValue(sessionValue);
  if (!session) {
    throw new ByokBrokerError(401, "INVALID_CONTROL_PLANE_SESSION", "Control plane session cookie is invalid.");
  }

  const actorType = normalizeActorType(payload.actor_type, "HUMAN");
  const actorRef = sanitizeIdentifier(payload.actor_external_ref) || session.actorRef;

  if (actorType !== "HUMAN") {
    throw new ByokBrokerError(403, "FORBIDDEN_ACTOR", "Human authority is required to issue BYOK reference tokens.");
  }

  if (!actorRef) {
    throw new ByokBrokerError(403, "MISSING_ACTOR_REF", "Human actor reference is required.");
  }

  return { actorType: "HUMAN", actorRef };
}

export async function authorizeBrokerRedeemRequest(headers: Headers, payload: ByokLlmProxyRequest): Promise<BrokerActor> {
  const internalSecret = process.env.BROKER_INTERNAL_SECRET?.trim() || "";
  const providedInternalSecret = headers.get("x-broker-internal-secret")?.trim() || "";

  if (internalSecret && providedInternalSecret && providedInternalSecret === internalSecret) {
    return {
      actorType: normalizeActorType(payload.actor_type, "N8N"),
      actorRef: sanitizeIdentifier(payload.actor_external_ref) || "n8n:brokered-llm-call"
    };
  }

  return authorizeHumanRequest(headers, payload);
}

async function callVaultRpc<T>(functionName: string, body: Record<string, unknown>): Promise<T[]> {
  const config = getSupabaseVaultConfig();
  let response: Response;

  try {
    response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Profile": BYOK_RPC_SCHEMA,
        "Content-Profile": BYOK_RPC_SCHEMA
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new ByokBrokerError(
      502,
      "VAULT_RPC_NETWORK_FAILED",
      `Vault RPC ${functionName} network call failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new ByokBrokerError(
      response.status >= 400 && response.status < 500 ? 403 : 502,
      "VAULT_RPC_FAILED",
      `Vault RPC ${functionName} failed (${response.status}): ${bodyText || response.statusText}`
    );
  }

  const payload = await response.json();
  return Array.isArray(payload) ? (payload as T[]) : [payload as T];
}

export async function issueReferenceToken(request: ByokIssueTokenRequest, actor: BrokerActor) {
  const credentialRef = sanitizeIdentifier(request.credential_ref);
  const scope = sanitizeIdentifier(request.scope);

  if (!credentialRef || !scope) {
    throw new ByokBrokerError(400, "INVALID_TOKEN_REQUEST", "credential_ref and scope are required.");
  }

  if (!isLlmScope(scope)) {
    throw new ByokBrokerError(403, "INVALID_TOKEN_SCOPE", "BYOK broker only issues LLM-scoped reference tokens.");
  }

  const requestId = crypto.randomUUID();
  const expiresAt = request.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const rows = await callVaultRpc<IssueReferenceTokenRow>("byok_issue_reference_token", {
    p_credential_ref: credentialRef,
    p_scope: scope,
    p_requested_by_actor_type: actor.actorType,
    p_requested_by_actor_ref: actor.actorRef,
    p_request_id: requestId,
    p_expires_at: expiresAt
  });

  const token = rows[0];
  if (!token?.lease_token) {
    throw new ByokBrokerError(502, "VAULT_TOKEN_ISSUE_EMPTY", "Vault did not return a reference token.");
  }

  return {
    jti: token.jti,
    lease_token: token.lease_token,
    expires_at: token.expires_at,
    broker_receipt_ref: token.broker_receipt_ref,
    request_id: requestId
  };
}

export async function consumeReferenceToken(referenceToken: string, actor: BrokerActor) {
  if (!referenceToken.trim()) {
    throw new ByokBrokerError(400, "MISSING_REFERENCE_TOKEN", "reference_token is required.");
  }

  const requestId = crypto.randomUUID();
  const rows = await callVaultRpc<ConsumeReferenceTokenRow>("byok_consume_reference_token", {
    p_lease_token: referenceToken,
    p_requested_by_actor_type: actor.actorType,
    p_requested_by_actor_ref: actor.actorRef,
    p_request_id: requestId
  });

  const consumed = rows[0];
  if (!consumed?.ciphertext) {
    throw new ByokBrokerError(502, "VAULT_TOKEN_CONSUME_EMPTY", "Vault did not return a decryptable secret package.");
  }

  return {
    ...consumed,
    request_id: requestId
  };
}

export async function redeemReferenceToken(
  referenceToken: string,
  organizationId: string,
  integrationKey: string,
  actor: BrokerActor
) {
  // 1. Consume token to get encrypted envelope
  const consumed = await consumeReferenceToken(referenceToken, actor);

  // 2. Validate tenant scope
  const supabase = createServiceRoleClient();
  const { data: credentialRef, error: lookupError } = await supabase.rpc(
    "phase075_get_tenant_vault_credential_ref",
    {
      p_organization_id: organizationId,
      p_integration_key: integrationKey
    }
  );

  if (lookupError) {
     throw new ByokBrokerError(500, "TENANT_LOOKUP_FAILED", `Failed to query tenant_integrations: ${lookupError.message}`);
  }
  
  if (!credentialRef || credentialRef !== consumed.credential_ref) {
     throw new ByokBrokerError(403, "TENANT_SCOPE_MISMATCH", "Token does not match the provided organization and integration context.");
  }

  // 3. Decrypt payload
  const secretBuffer = decryptSecretPackage(consumed);
  const rawSecretStr = secretBuffer.toString("utf8").trim();

  if (!rawSecretStr) {
    throw new ByokBrokerError(502, "VAULT_SECRET_EMPTY", "Secret package decrypted to an empty credential.");
  }

  let accessToken = rawSecretStr;
  let pageId = "";

  try {
    const parsed = JSON.parse(rawSecretStr);
    if (parsed.access_token) accessToken = parsed.access_token;
    if (parsed.page_id) pageId = parsed.page_id;
  } catch {
    // Not JSON, assume the entire string is the access token
  }

  secretBuffer.fill(0); // Clear memory

  return {
    access_token: accessToken,
    page_id: pageId,
    expires_at: consumed.expires_at,
    broker_receipt_ref: consumed.broker_receipt_ref
  };
}

function decodeStrictBase64(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new ByokBrokerError(503, "VAULT_CIPHER_PACKAGE_INVALID", `${label} must be valid base64.`);
  }

  return Buffer.from(normalized, "base64");
}

function decodeByteaToBuffer(value: string): Buffer {
  const trimmed = value.trim();
  if (trimmed.startsWith("\\x")) return Buffer.from(trimmed.slice(2), "hex");
  return Buffer.from(trimmed, "base64");
}

function parseCipherPackage(ciphertextStr: string, nonceStr: string, version: string = "v1"): VaultCipherPackage {
  if (!ciphertextStr) {
    throw new ByokBrokerError(502, "VAULT_CIPHER_PACKAGE_INVALID", "Cipher package ciphertext must not be empty.");
  }

  // Support old string-based format for backwards compatibility
  const decodedString = Buffer.from(ciphertextStr.startsWith("\\x") ? ciphertextStr.slice(2) : ciphertextStr, ciphertextStr.startsWith("\\x") ? "hex" : "base64").toString("utf8");
  if (decodedString.startsWith("v1:")) {
    const parts = decodedString.split(":");
    if (parts.length === 4) {
      const [parsedVersion, ivBase64, ciphertextBase64, authTagBase64] = parts.map((part) => part.trim());
      return {
        version: parsedVersion,
        iv: Buffer.from(ivBase64, "base64"),
        ciphertext: Buffer.from(ciphertextBase64, "base64"),
        authTag: Buffer.from(authTagBase64, "base64")
      };
    }
  }

  // Modern bytea format: auth_tag (16 bytes) is appended to ciphertext bytea
  const ciphertextBytes = decodeByteaToBuffer(ciphertextStr);
  const iv = decodeByteaToBuffer(nonceStr);

  if (iv.byteLength !== 12) {
    iv.fill(0);
    throw new ByokBrokerError(502, "VAULT_CIPHER_PACKAGE_INVALID", "AES-256-GCM IV must be 12 bytes.");
  }

  if (ciphertextBytes.byteLength < 16) {
    iv.fill(0);
    ciphertextBytes.fill(0);
    throw new ByokBrokerError(502, "VAULT_CIPHER_PACKAGE_INVALID", "Cipher package ciphertext too short to contain auth tag.");
  }

  const authTag = ciphertextBytes.subarray(ciphertextBytes.length - 16);
  const ciphertext = ciphertextBytes.subarray(0, ciphertextBytes.length - 16);

  if (ciphertext.byteLength === 0) {
    iv.fill(0);
    authTag.fill(0);
    throw new ByokBrokerError(502, "VAULT_CIPHER_PACKAGE_INVALID", "Cipher package ciphertext must not be empty.");
  }

  return {
    version,
    iv,
    ciphertext,
    authTag
  };
}

export function parseMasterKeysEnv(): VaultMasterKeysEnv {
  const keyMapText = process.env.PN_VAULT_MASTER_KEYS_JSON?.trim() || "";
  if (!keyMapText) {
    throw new ByokBrokerError(
      503,
      "VAULT_MASTER_KEY_ENV_MISSING",
      "BYOK broker is fail-closed because server-side master key material is missing."
    );
  }

  let parsed: Partial<VaultMasterKeysEnv>;
  try {
    parsed = JSON.parse(keyMapText) as Partial<VaultMasterKeysEnv>;
  } catch {
    throw new ByokBrokerError(503, "VAULT_MASTER_KEY_ENV_INVALID", "PN_VAULT_MASTER_KEYS_JSON is not valid JSON.");
  }

  const active = typeof parsed.active === "string" ? parsed.active.trim() : "";
  const keys = parsed.keys && typeof parsed.keys === "object" && !Array.isArray(parsed.keys) ? parsed.keys : null;

  if (!active) {
    throw new ByokBrokerError(503, "VAULT_MASTER_KEY_ACTIVE_MISSING", "PN_VAULT_MASTER_KEYS_JSON.active is required.");
  }

  if (!keys) {
    throw new ByokBrokerError(503, "VAULT_MASTER_KEYS_MISSING", "PN_VAULT_MASTER_KEYS_JSON.keys is required.");
  }

  if (typeof keys[active] !== "string" || !keys[active].trim()) {
    throw new ByokBrokerError(503, "VAULT_MASTER_KEY_ACTIVE_NOT_FOUND", "PN_VAULT_MASTER_KEYS_JSON.keys must contain the active key.");
  }

  return {
    active,
    keys: keys as Record<string, string>
  };
}

export function decodeMasterKey(version: string) {
  const keyMap = parseMasterKeysEnv();
  const encoded = keyMap.keys[version]?.trim();

  if (!encoded) {
    throw new ByokBrokerError(503, "VAULT_MASTER_KEY_NOT_FOUND", "No server-side master key exists for the cipher package version.");
  }

  const key = decodeStrictBase64(encoded, "Vault master key");

  if (key.byteLength !== 32) {
    key.fill(0);
    throw new ByokBrokerError(503, "VAULT_MASTER_KEY_INVALID", "Vault master key must decode to exactly 32 bytes.");
  }

  return key;
}

export function decryptSecretPackage(consumed: Awaited<ReturnType<typeof consumeReferenceToken>>) {
  const keyMap = parseMasterKeysEnv();
  const activeKeyText = keyMap.keys[keyMap.active]?.trim() || "";
  const activeKeyFingerprint = createHash("sha256").update(Buffer.from(activeKeyText, "base64")).digest("hex");

  const cipherPackage = parseCipherPackage(consumed.ciphertext || "", consumed.ciphertext_nonce || "");

  const key = decodeMasterKey(cipherPackage.version);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, cipherPackage.iv);
    decipher.setAuthTag(cipherPackage.authTag);
    return Buffer.concat([decipher.update(cipherPackage.ciphertext), decipher.final()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ByokBrokerError(
      502,
      message.includes("authenticate data") ? "VAULT_CIPHER_AUTH_FAILED" : "VAULT_SECRET_DECRYPT_FAILED",
      `Secret package decrypt failed: ${message}`
    );
  } finally {
    key.fill(0);
    cipherPackage.iv.fill(0);
    cipherPackage.ciphertext.fill(0);
    cipherPackage.authTag.fill(0);
    keyMap.keys[keyMap.active] = "";
  }
}

function validateOpenAiPayload(request: ByokLlmProxyRequest) {
  if (request.provider !== "openai") {
    throw new ByokBrokerError(400, "UNSUPPORTED_LLM_PROVIDER", "Only provider=openai is currently supported by the broker.");
  }

  if (!request.model?.trim()) {
    throw new ByokBrokerError(400, "MISSING_LLM_MODEL", "model is required.");
  }

  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw new ByokBrokerError(400, "MISSING_LLM_MESSAGES", "messages must be a non-empty array.");
  }

  for (const message of request.messages) {
    if (!message || typeof message.content !== "string" || !message.content.trim()) {
      throw new ByokBrokerError(400, "INVALID_LLM_MESSAGES", "Every message must include non-empty content.");
    }

    if (!["system", "user", "assistant"].includes(message.role)) {
      throw new ByokBrokerError(400, "INVALID_LLM_MESSAGES", "Every message must use a supported role.");
    }
  }
}

async function callOpenAiChatCompletions(request: ByokLlmProxyRequest, apiKey: string) {
  const endpoint = process.env.BYOK_OPENAI_CHAT_COMPLETIONS_URL?.trim() || "https://api.openai.com/v1/chat/completions";
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
        ...(typeof request.max_tokens === "number" ? { max_tokens: request.max_tokens } : {})
      })
    });
  } catch (error) {
    throw new ByokBrokerError(
      502,
      "LLM_PROVIDER_NETWORK_FAILED",
      `LLM provider network call failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  if (!response.ok) {
    throw new ByokBrokerError(
      response.status >= 400 && response.status < 500 ? response.status : 502,
      "LLM_PROVIDER_CALL_FAILED",
      `LLM provider call failed (${response.status}).`
    );
  }

  return payload;
}

export async function runBrokeredLlmCall(request: ByokLlmProxyRequest, actor: BrokerActor) {
  validateOpenAiPayload(request);

  const consumed = await consumeReferenceToken(request.reference_token ?? "", actor);
  const secretBuffer = decryptSecretPackage(consumed);
  let apiKey = secretBuffer.toString("utf8").trim();

  try {
    if (!apiKey) {
      throw new ByokBrokerError(502, "VAULT_SECRET_EMPTY", "Secret package decrypted to an empty credential.");
    }

    const result = await callOpenAiChatCompletions(request, apiKey);
    return {
      broker_receipt_ref: consumed.broker_receipt_ref,
      request_id: consumed.request_id,
      credential_ref: consumed.credential_ref,
      scope: consumed.scope,
      provider: request.provider,
      model: request.model,
      result
    };
  } finally {
    secretBuffer.fill(0);
    apiKey = "";
  }
}

export { authorizeHumanRequest };
\n
export async function verifyReferenceToken(referenceToken: string) {
  if (!referenceToken.trim()) {
    throw new ByokBrokerError(400, "MISSING_REFERENCE_TOKEN", "reference_token is required.");
  }

  const rows = await callVaultRpc<any>("byok_verify_reference_token", {
    p_lease_token: referenceToken
  });

  const token = rows[0];
  if (!token) {
    throw new ByokBrokerError(404, "TOKEN_NOT_FOUND", "Token does not exist.");
  }

  return token;
}
