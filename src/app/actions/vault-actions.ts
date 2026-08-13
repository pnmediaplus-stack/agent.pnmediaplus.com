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

    const vaultCredentialRef = `${authContext.organizationId.replace(/-/g, "")}__${normalizedProviderCode}__${normalizedIntegrationKey}`;
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

    if (error && String(error.message || "").includes("CREDENTIAL_NOT_FOUND")) {
      const createCredential = await supabase.rpc("byok_create_credential", {
        p_credential_ref: vaultCredentialRef,
        p_owner_ref: authContext.organizationId,
        p_provider_code: normalizedProviderCode,
        p_credential_name: `${normalizedProviderCode} ${normalizedIntegrationKey}`,
        p_created_by_actor_type: "HUMAN",
        p_created_by_actor_ref: authContext.userId,
        p_secret_kind: "API_KEY"
      });

      if (createCredential.error) {
        return { ok: false, state: "blocked", reason: `CREDENTIAL_CREATE_FAILED: ${createCredential.error.message}` };
      }

      ({ data, error } = await issueToken());
    }

    if (error) {
      console.error("Vault issue token error:", error);
      return { ok: false, state: "blocked", reason: error.message };
    }

    // The RPC returns { jti, lease_token, expires_at, broker_receipt_ref }
    const tokenData = Array.isArray(data) ? data[0] : data;

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

    const supabase = createServiceRoleClient();
    
    // First get the existing record to merge metadata
    const { data: existing, error: findError } = await supabase
      .schema("tenant_integration_vault")
      .from("tenant_integrations")
      .select("id, public_metadata, provider_id")
      .eq("integration_key", integrationKey)
      .eq("organization_id", auth.organizationId)
      .single();

    if (findError || !existing) {
      return { ok: false, state: "blocked", reason: "INTEGRATION_NOT_FOUND" };
    }

    const { data: provider, error: providerError } = await supabase
      .schema("tenant_integration_vault")
      .from("integration_providers")
      .select("public_metadata")
      .eq("id", existing.provider_id)
      .single();

    if (providerError || !provider) {
      return { ok: false, state: "blocked", reason: "PROVIDER_NOT_FOUND" };
    }

    const allowedKeys = ['preferred_text_model', 'preferred_image_model'];
    const validatedUpdates: Record<string, any> = {};
    const availableModels = Array.isArray(provider.public_metadata?.models) ? provider.public_metadata.models : [];

    for (const [key, value] of Object.entries(metadataUpdates)) {
      if (!allowedKeys.includes(key)) {
        return { ok: false, state: "blocked", reason: `INVALID_METADATA_KEY: ${key} is not allowed.` };
      }
      
      if (value === "" || value === null || value === undefined) {
         validatedUpdates[key] = null;
         continue;
      }
      
      const isValid = availableModels.some((m: any) => m.code === value);
      if (!isValid) {
        return { ok: false, state: "blocked", reason: `INVALID_MODEL: ${value} is not in the provider catalog.` };
      }
      
      validatedUpdates[key] = value;
    }

    const newMetadata = {
      ...(typeof existing.public_metadata === "object" && existing.public_metadata !== null ? existing.public_metadata : {}),
      ...validatedUpdates
    };

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/tenant_integrations?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Accept-Profile": "tenant_integration_vault",
        "Content-Profile": "tenant_integration_vault",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ public_metadata: newMetadata })
    });

    if (!updateRes.ok) {
       return { ok: false, state: "blocked", reason: `METADATA_UPDATE_FAILED: ${updateRes.status}` };
    }

    return { ok: true, state: "ready", reason: "METADATA_UPDATED" };
  } catch (error: any) {
    return { ok: false, state: "blocked", reason: `INTERNAL_ERROR: ${error.message}` };
  }
}
