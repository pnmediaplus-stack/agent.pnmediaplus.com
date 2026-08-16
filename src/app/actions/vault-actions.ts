"use server";

import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAuthContext } from "@/lib/portal-auth";

import { createCipheriv, randomBytes, createHash, randomUUID } from "crypto";

export type VaultActionResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  data?: any;
};

export type EncryptedSecretPayload = {
  cipher_package: string;
  ciphertext_sha256: string;
  raw_iv_b64?: string;
  raw_ciphertext_b64?: string;
  raw_auth_tag_b64?: string;
};

function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("PHASE074_TENANT_INTEGRATION_ALREADY_EXISTS") || message.includes("ALREADY_EXISTS");
}

function isNotRotatableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("PHASE074_TENANT_INTEGRATION_NOT_ROTATABLE") || message.includes("NOT_ROTATABLE");
}

type TenantIntegrationConnectionState = "unverified" | "healthy";

async function resetTenantIntegrationState(
  organizationId: string,
  integrationKey: string,
  publicMetadata?: any,
  connectionState: TenantIntegrationConnectionState = "unverified",
  lastVerifiedAt?: string
) {
  const supabase = createServiceRoleClient();
  const payload: any = {
    organization_id: organizationId,
    integration_key: integrationKey,
    status: "configured",
    connection_state: connectionState
  };
  if (publicMetadata) {
    payload.public_metadata = publicMetadata;
  }
  if (lastVerifiedAt) {
    payload.last_verified_at = lastVerifiedAt;
  }
  const { error } = await supabase.rpc("phase075_reset_tenant_integration_state", {
    payload
  });

  if (error) {
    throw new Error(`TENANT_INTEGRATION_RESET_FAILED: ${error.message}`);
  }
}

async function readPublicTenantIntegrationRow<T>(
  accessToken: string,
  table: string,
  select: string,
  filters: Record<string, string>
): Promise<T | null> {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !anonKey) {
    throw new Error("PHASE070_SUPABASE_ENV_MISSING");
  }

  const endpoint = new URL(`${supabaseUrl}/rest/v1/${table}`);
  endpoint.searchParams.set("select", select);
  for (const [key, value] of Object.entries(filters)) {
    endpoint.searchParams.set(key, `eq.${value}`);
  }

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Accept-Profile": "public"
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`PHASE070_PUBLIC_VIEW_READ_FAILED:${table}:${response.status}:${body || response.statusText}`);
  }

  const rows = (await response.json().catch(() => [])) as T[];
  return Array.isArray(rows) ? (rows[0] ?? null) : null;
}

import { parseMasterKeysEnv, decodeMasterKey } from "@/lib/byok-secret-broker";

/**
 * TODO: TEMPORARY MOCK FOR LOCAL PROTOTYPE
 * In the final Phase 16/17 Production BYOK design, the Next.js backend MUST NOT perform envelope encryption locally using a dummy key.
 * Next.js will act as a trusted boundary and forward the plaintext secret over a secure internal TLS/gRPC connection 
 * to a dedicated KMS Broker (e.g., pn_vault service, AWS KMS, HashiCorp Vault) to retrieve the EncryptedSecretPayload.
 * When the real Broker API is available, replace the internal logic of this helper without changing the action signature.
 */
function buildEncryptedSecretPayload(secretMaterial: string): EncryptedSecretPayload {
  // Enforce fail-closed behavior: only encrypt if valid server-side master key is present.
  const keyMap = parseMasterKeysEnv();
  const key = decodeMasterKey(keyMap.active);

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secretMaterial, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivB64 = iv.toString("base64");
  const ciphertextB64 = encrypted.toString("base64");
  const authTagB64 = authTag.toString("base64");

  const cipherPackage = `v1:${ivB64}:${ciphertextB64}:${authTagB64}`;
  const ciphertext_sha256 = createHash("sha256").update(cipherPackage).digest("hex");
  
  return { 
    cipher_package: cipherPackage, 
    ciphertext_sha256, 
    raw_iv_b64: ivB64, 
    raw_ciphertext_b64: ciphertextB64, 
    raw_auth_tag_b64: authTagB64 
  };
}

type FacebookPageSecretInput = {
  access_token: string;
  page_id?: string;
};

function buildSecretInput(accessToken: string, pageId?: string): FacebookPageSecretInput {
  return {
    access_token: accessToken.trim(),
    ...(pageId?.trim() ? { page_id: pageId.trim() } : {})
  };
}

export async function createTenantIntegration(
  providerCode: string,
  integrationKey: string,
  integrationName: string,
  accessToken: string,
  pageId?: string
): Promise<VaultActionResponse> {
  try {
    const authContext = await requireAuthContext();

    if (authContext.role !== "admin" && authContext.role !== "approver" && authContext.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const supabase = createServiceRoleClient();

    let facebookMetadata: any = null;
    if (providerCode === "facebook_page") {
      try {
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=name,picture.type(large)&access_token=${accessToken}`);
        if (!fbRes.ok) {
           return { ok: false, state: "blocked", reason: "INVALID_FACEBOOK_TOKEN" };
        }
        const fbData = await fbRes.json();
        facebookMetadata = {
           page_name: fbData.name,
           page_id: fbData.id,
           page_avatar_url: fbData.picture?.data?.url,
           provider_code: "facebook_page"
        };
      } catch (err) {
        return { ok: false, state: "blocked", reason: "FACEBOOK_API_ERROR" };
      }
    }

    const secretInput = buildSecretInput(accessToken, pageId);
    
    // In a real BYOK flow, secretInput would be sent securely to the KMS Broker.
    // For local dev, we stringify it before passing to our mock encrypter.
    const secretMaterialString = providerCode === "facebook_page" ? JSON.stringify(secretInput) : accessToken;
    const encryptedPayload = buildEncryptedSecretPayload(secretMaterialString);

    const payload = {
      organization_id: authContext.organizationId,
      provider_code: providerCode,
      integration_key: integrationKey,
      integration_name: integrationName,
      encryption_contract_ref: "aes_256_gcm_v1",
      encryption_algorithm: "byok_envelope_v1",
      key_ref: "client_byok_key",
      key_version: 1,
      ciphertext_sha256: encryptedPayload.ciphertext_sha256,
      actor_type: "HUMAN",
      actor_ref: authContext.userId,
      request_id: randomUUID(),
      encrypted_secret_payload: encryptedPayload
    };

    const { data, error } = await supabase.rpc("phase074_create_tenant_integration", {
      payload
    });

    if (error) {
      if (isAlreadyExistsError(error)) {
        await resetTenantIntegrationState(authContext.organizationId, integrationKey);
          
        return rotateTenantIntegration(integrationKey, accessToken, pageId);
      }
      console.error("Vault create error:", error);
      return { ok: false, state: "blocked", reason: error.message };
    }

    if (facebookMetadata) {
      await resetTenantIntegrationState(authContext.organizationId, integrationKey, facebookMetadata, "healthy", new Date().toISOString());
    }

    return { ok: true, state: "ready", reason: "SUCCESS", data: { receipt: data } };
  } catch (err: any) {
    return { ok: false, state: "blocked", reason: err.message };
  }
}

export async function rotateTenantIntegration(
  integrationKey: string,
  accessToken: string,
  pageId?: string
): Promise<VaultActionResponse> {
  try {
    const authContext = await requireAuthContext();

    if (authContext.role !== "admin" && authContext.role !== "approver" && authContext.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const supabase = createServiceRoleClient();

    let facebookMetadata: any = null;
    if (pageId) { // If pageId is provided, it's a facebook_page rotate
      try {
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=name,picture.type(large)&access_token=${accessToken}`);
        if (!fbRes.ok) {
           return { ok: false, state: "blocked", reason: "INVALID_FACEBOOK_TOKEN" };
        }
        const fbData = await fbRes.json();
        facebookMetadata = {
           page_name: fbData.name,
           page_id: fbData.id,
           page_avatar_url: fbData.picture?.data?.url,
           provider_code: "facebook_page"
        };
      } catch (err) {
        return { ok: false, state: "blocked", reason: "FACEBOOK_API_ERROR" };
      }
    }

    const secretInput = buildSecretInput(accessToken, pageId);
    const secretMaterialString = pageId ? JSON.stringify(secretInput) : accessToken;
    const encryptedPayload = buildEncryptedSecretPayload(secretMaterialString);
    
    const payload = {
      organization_id: authContext.organizationId,
      integration_key: integrationKey,
      encryption_contract_ref: "aes_256_gcm_v1",
      encryption_algorithm: "byok_envelope_v1",
      key_ref: "client_byok_key",
      key_version: 1,
      ciphertext_sha256: encryptedPayload.ciphertext_sha256,
      actor_type: "HUMAN",
      actor_ref: authContext.userId,
      encrypted_secret_payload: encryptedPayload
    };

    let { data, error } = await supabase.rpc("phase074_rotate_tenant_integration", {
      payload
    });

    if (error && isNotRotatableError(error)) {
      await resetTenantIntegrationState(authContext.organizationId, integrationKey);
        
      const retry = await supabase.rpc("phase074_rotate_tenant_integration", {
        payload
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Vault rotate error:", error);
      return { ok: false, state: "blocked", reason: error.message };
    }

    if (facebookMetadata) {
      await resetTenantIntegrationState(authContext.organizationId, integrationKey, facebookMetadata, "healthy", new Date().toISOString());
    }

    return { ok: true, state: "ready", reason: "SUCCESS", data: { receipt: data } };
  } catch (err: any) {
    return { ok: false, state: "blocked", reason: err.message };
  }
}

export async function revokeTenantIntegration(
  integrationKey: string
): Promise<VaultActionResponse> {
  try {
    const authContext = await requireAuthContext();

    if (authContext.role !== "admin" && authContext.role !== "approver" && authContext.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const supabase = createServiceRoleClient();
    
    const payload = {
      organization_id: authContext.organizationId,
      integration_key: integrationKey,
      actor_type: "HUMAN",
      actor_ref: authContext.userId
    };

    const { data, error } = await supabase.rpc("phase074_revoke_tenant_integration", {
      payload
    });

    if (error) {
      console.error("Vault revoke error:", error);
      return { ok: false, state: "blocked", reason: error.message };
    }

    return { ok: true, state: "ready", reason: "SUCCESS", data: { receipt: data } };
  } catch (err: any) {
    return { ok: false, state: "blocked", reason: err.message };
  }
}

export async function issueReferenceToken(
  integrationKey: string,
  providerCode: string
): Promise<VaultActionResponse> {
  try {
    const authContext = await requireAuthContext();

    if (authContext.role !== "admin" && authContext.role !== "approver" && authContext.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const supabase = createServiceRoleClient();
    const normalizedProviderCode = providerCode.trim();
    const normalizedIntegrationKey = integrationKey.trim();
    if (!normalizedProviderCode || !normalizedIntegrationKey) {
      return { ok: false, state: "blocked", reason: "CREDENTIAL_MAPPING_NOT_FOUND" };
    }

    const { data: vaultCredentialRef, error: credentialRefError } = await supabase.rpc(
      "phase075_get_tenant_vault_credential_ref",
      {
        p_organization_id: authContext.organizationId,
        p_integration_key: normalizedIntegrationKey
      }
    );

    if (credentialRefError) {
      return {
        ok: false,
        state: "blocked",
        reason: `CREDENTIAL_REF_LOOKUP_FAILED: ${credentialRefError.message}`
      };
    }

    if (!vaultCredentialRef || typeof vaultCredentialRef !== "string") {
      return { ok: false, state: "blocked", reason: "CREDENTIAL_MAPPING_NOT_FOUND" };
    }

    const issueToken = async () =>
      supabase.rpc("byok_issue_reference_token", {
      p_credential_ref: vaultCredentialRef,
      p_scope: "n8n_dispatch",
      p_requested_by_actor_type: "HUMAN",
      p_requested_by_actor_ref: authContext.userId,
      p_request_id: randomUUID(),
      p_expires_at: new Date(Date.now() + 5 * 60000).toISOString() // 5 minutes
      });

    let { data, error } = await issueToken();

    if (error) {
      console.error("Vault issue token error:", error);
      return { ok: false, state: "blocked", reason: error.message };
    }

    // The RPC returns { jti, lease_token, expires_at, broker_receipt_ref }
    const tokenData = Array.isArray(data) ? data[0] : data;

    await resetTenantIntegrationState(
      authContext.organizationId,
      normalizedIntegrationKey,
      undefined,
      "healthy",
      new Date().toISOString()
    );

    return { 
      ok: true, 
      state: "ready", 
      reason: "SUCCESS", 
      data: { 
        receipt: { 
          lease_token: tokenData?.lease_token || "MISSING_TOKEN",
          broker_receipt_ref: tokenData?.broker_receipt_ref || "MISSING_RECEIPT",
          broker_status: "PASSED" 
        } 
      } 
    }
  } catch (error: any) {
    return { ok: false, state: "blocked", reason: `INTERNAL_ERROR: ${error.message}` };
  }
}

export async function updateTenantIntegrationMetadata(
  integrationKey: string,
  metadataUpdates: Record<string, any>
): Promise<VaultActionResponse> {
  try {
    const auth = await requireAuthContext();
    if (!auth.organizationId) {
      return { ok: false, state: "blocked", reason: "MISSING_ORGANIZATION_CONTEXT" };
    }

    const existing = await readPublicTenantIntegrationRow<{
      public_metadata: Record<string, any>;
      provider_code: string;
      status: string;
      connection_state: string;
      organization_id: string;
      integration_key: string;
    }>(
      auth.accessToken,
      "phase070_tenant_integration_status",
      "public_metadata,provider_code,status,connection_state,organization_id,integration_key",
      {
        organization_id: auth.organizationId,
        integration_key: integrationKey
      }
    );

    if (!existing) {
      return { ok: false, state: "blocked", reason: "INTEGRATION_NOT_FOUND" };
    }

    const provider = await readPublicTenantIntegrationRow<{
      public_metadata: Record<string, any>;
      provider_code: string;
    }>(
      auth.accessToken,
      "phase070_integration_provider_catalog",
      "public_metadata,provider_code",
      {
        provider_code: existing.provider_code
      }
    );

    if (!provider) {
      return { ok: false, state: "blocked", reason: "PROVIDER_NOT_FOUND" };
    }

    const allowedKeys = ['preferred_text_model', 'preferred_image_model'];
    const validatedUpdates: Record<string, any> = {};
    const availableModels = Array.isArray(provider.public_metadata?.models) ? provider.public_metadata.models : [];

    for (const [key, value] of Object.entries(metadataUpdates)) {
      if (!allowedKeys.includes(key)) {
        return { ok: false, state: "blocked", reason: `INVALID_METADATA_KEY: ${key} is not allowed.` };
      }
      
      // Ensure the chosen model is actually offered by the provider
      if (value !== null && value !== "" && value !== "default") {
        const modelInfo = availableModels.find((m: any) => m.code === value);
        if (!modelInfo) {
          return { ok: false, state: "blocked", reason: `INVALID_MODEL: ${value} is not a valid model for this provider.` };
        }
      }
      
      validatedUpdates[key] = value;
    }

    const newMetadata = { ...((existing.public_metadata as object) || {}), ...validatedUpdates };

    // Update using the reset RPC which is publicly exposed
    await resetTenantIntegrationState(
      auth.organizationId,
      integrationKey,
      newMetadata,
      existing.connection_state === "healthy" ? "healthy" : "unverified",
      undefined // do not change lastVerifiedAt
    );

    return { ok: true, state: "ready", reason: "METADATA_UPDATED" };
  } catch (error: any) {
    return { ok: false, state: "blocked", reason: `INTERNAL_ERROR: ${error.message}` };
  }
}

export async function upsertIntegrationProvider(
  id: string | null,
  payload: {
    provider_code: string;
    provider_name: string;
    auth_type: string;
    public_metadata: Record<string, any>;
  }
): Promise<VaultActionResponse> {
  try {
    const auth = await requireAuthContext();
    if (auth.role !== "admin" && auth.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    if (!/^[a-z0-9_]+$/.test(payload.provider_code)) {
      return { ok: false, state: "blocked", reason: "INVALID_PROVIDER_CODE" };
    }

    const rpcName = (process.env.PHASE070_PROVIDER_CATALOG_WRITE_RPC || "phase070_upsert_integration_provider").trim();

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc(rpcName, {
      payload: {
        provider_code: payload.provider_code,
        provider_name: payload.provider_name,
        provider_category: 'ai',
        auth_type: payload.auth_type,
        public_metadata: payload.public_metadata
      }
    });

    if (error) {
      return { ok: false, state: "blocked", reason: `UPSERT_FAILED: ${error.message}` };
    }

    return { ok: true, state: "ready", reason: "PROVIDER_UPSERTED", data };
  } catch (error: any) {
    return { ok: false, state: "blocked", reason: `INTERNAL_ERROR: ${error.message}` };
  }
}

export async function deleteIntegrationProvider(providerCode: string): Promise<VaultActionResponse> {
  try {
    const auth = await requireAuthContext();
    if (auth.role !== "admin" && auth.role !== "owner") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const rpcName = (process.env.PHASE070_PROVIDER_CATALOG_DELETE_RPC || "phase070_delete_integration_provider").trim();

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc(rpcName, {
      payload: {
        provider_code: providerCode
      }
    });

    if (error) {
      return { ok: false, state: "blocked", reason: `DELETE_FAILED: ${error.message}` };
    }

    return { ok: true, state: "ready", reason: "PROVIDER_DELETED", data };
  } catch (error: any) {
    return { ok: false, state: "blocked", reason: `INTERNAL_ERROR: ${error.message}` };
  }
}
