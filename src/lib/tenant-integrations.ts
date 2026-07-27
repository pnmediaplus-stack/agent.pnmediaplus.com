import "server-only";

import { createCipheriv, createHash, createHmac, randomBytes } from "crypto";
import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
};

type RuntimeOperation = "create" | "rotate" | "revoke" | "broker_call";

export type Phase070ProviderCatalogItem = {
  provider_code: string;
  provider_name: string;
  provider_category: string;
  auth_type: string;
  status: string;
  capabilities: unknown[];
  public_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Phase070TenantIntegrationStatus = {
  organization_id: string;
  organization_key: string;
  provider_code: string;
  provider_name: string;
  provider_category: string;
  integration_key: string;
  integration_name: string;
  status: string;
  connection_state: string;
  last_verified_at: string | null;
  credential_configured: boolean;
  public_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TenantIntegrationsLoadResult =
  | {
      state: "ready";
      reason: "PHASE070_TENANT_INTEGRATIONS_LOADED";
      providers: Phase070ProviderCatalogItem[];
      integrations: Phase070TenantIntegrationStatus[];
      organization: {
        organization_id: string;
        organization_key: string;
        organization_name: string;
        role: string;
      };
    }
  | {
      state: "blocked";
      reason: string;
      providers: [];
      integrations: [];
      organization: null;
    };

type WriteBlockedResult = {
  state: "blocked";
  reason: string;
  receipt: {
    receipt_ref: string;
    receipt_state: "blocked";
    redaction_status: "NO_SECRET_MATERIAL_RETURNED";
  };
};

const TENANT_INTEGRATION_AUTHORITY_ROLES = new Set(["owner", "admin", "manager"]);
const PHASE070_BROKER_RUNTIME_AUTHORITY = (process.env.PHASE070_BROKER_RUNTIME_AUTHORITY || "").trim();
const PHASE071_RUNTIME_AUTHORITY = (process.env.PHASE071_TENANT_INTEGRATION_RUNTIME_AUTHORITY || "").trim();
const PHASE071_DOWNSTREAM_CONTRACT = (process.env.PHASE071_BROKER_DOWNSTREAM_CONTRACT || "").trim();
const PHASE071_DOWNSTREAM_URL = (process.env.PHASE071_BROKER_DOWNSTREAM_URL || "").trim();
const PHASE071_DOWNSTREAM_SECRET = (process.env.PHASE071_BROKER_DOWNSTREAM_SECRET || "").trim();
const PHASE072_LIVE_BROKER_AUTHORITY = (process.env.PHASE072_TENANT_INTEGRATION_LIVE_BROKER_AUTHORITY || "").trim();
const PHASE072_ENCRYPTION_KEY_AUTHORITY = (process.env.PHASE072_TENANT_INTEGRATION_ENCRYPTION_KEY_AUTHORITY || "").trim();
const PHASE072_DOWNSTREAM_CONTRACT = (process.env.PHASE072_BROKER_DOWNSTREAM_CONTRACT || PHASE071_DOWNSTREAM_CONTRACT).trim();
const PHASE072_DOWNSTREAM_URL = (process.env.PHASE072_BROKER_DOWNSTREAM_URL || PHASE071_DOWNSTREAM_URL).trim();
const PHASE072_DOWNSTREAM_SECRET = (process.env.PHASE072_BROKER_DOWNSTREAM_SECRET || PHASE071_DOWNSTREAM_SECRET).trim();
const PHASE074_RUNTIME_RPC_CONTRACT = (process.env.PHASE074_TENANT_INTEGRATION_RUNTIME_RPC_CONTRACT || "").trim();
const PHASE074_CREATE_RPC = (process.env.PHASE074_TENANT_INTEGRATION_CREATE_RPC || "").trim();
const PHASE074_ROTATE_RPC = (process.env.PHASE074_TENANT_INTEGRATION_ROTATE_RPC || "").trim();
const PHASE074_REVOKE_RPC = (process.env.PHASE074_TENANT_INTEGRATION_REVOKE_RPC || "").trim();
const TENANT_SECRET_CONTRACT_REF = "phase071_tenant_integration_secret_aes_256_gcm_v1";
const SECRET_MATERIAL_KEY_PATTERN = /(^|_)(secret|password|token|api_key|client_secret|access_token|refresh_token|ciphertext|auth_tag|iv_base64|encrypted_secret_payload)($|_)/i;
const SECRET_MATERIAL_VALUE_PATTERN = /\b(sk-[a-z0-9_-]{12,}|pk_[a-z0-9_-]{12,}|eyJ[a-z0-9_-]{20,})\b/i;

function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim() || null;

  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

function getRequiredServiceConfig() {
  const config = getSupabaseRuntimeConfig();

  if (!config || !config.serviceRoleKey) {
    return {
      state: "blocked" as const,
      reason: "PHASE071_SUPABASE_SERVICE_ROLE_MISSING"
    };
  }

  return {
    state: "ready" as const,
    config: {
      url: config.url,
      anonKey: config.anonKey,
      serviceRoleKey: config.serviceRoleKey
    }
  };
}

function getRuntimeAuthority() {
  if (PHASE071_RUNTIME_AUTHORITY !== "APPROVED") {
    return {
      state: "blocked" as const,
      reason: "PHASE071_TENANT_INTEGRATION_RUNTIME_AUTHORITY_NOT_APPROVED"
    };
  }

  return {
    state: "ready" as const
  };
}

export function isTenantIntegrationRuntimeAuthorityApproved() {
  return PHASE071_RUNTIME_AUTHORITY === "APPROVED";
}

function decodeBase64Key(value: string) {
  const key = Buffer.from(value, "base64");
  return key.byteLength === 32 ? key : null;
}

function getTenantVaultMasterKey() {
  const raw = (process.env.PHASE071_TENANT_INTEGRATION_MASTER_KEYS_JSON || process.env.PN_VAULT_MASTER_KEYS_JSON || "").trim();

  if (!raw) {
    return {
      state: "blocked" as const,
      reason: "PHASE071_TENANT_INTEGRATION_MASTER_KEYS_MISSING"
    };
  }

  try {
    const parsed = JSON.parse(raw) as { active?: unknown; keys?: unknown };
    const active = typeof parsed.active === "string" ? parsed.active : null;
    const keys = typeof parsed.keys === "object" && parsed.keys !== null ? (parsed.keys as Record<string, unknown>) : null;
    const encoded = active && keys && typeof keys[active] === "string" ? keys[active] : null;
    const key = encoded ? decodeBase64Key(encoded) : null;

    if (!active || !encoded || !key) {
      return {
        state: "blocked" as const,
        reason: "PHASE071_TENANT_INTEGRATION_MASTER_KEY_INVALID"
      };
    }

    const versionMatch = active.match(/\d+/);

    return {
      state: "ready" as const,
      key,
      keyRef: active,
      keyVersion: versionMatch ? Number(versionMatch[0]) : 1
    };
  } catch {
    return {
      state: "blocked" as const,
      reason: "PHASE071_TENANT_INTEGRATION_MASTER_KEYS_INVALID_JSON"
    };
  }
}

function encryptSecretMaterial(secretMaterial: string) {
  const masterKey = getTenantVaultMasterKey();

  if (masterKey.state === "blocked") return masterKey;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey.key, iv);
  const ciphertext = Buffer.concat([cipher.update(secretMaterial, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const ciphertextSha256 = createHash("sha256").update(ciphertext).digest("hex");

  return {
    state: "ready" as const,
    keyRef: masterKey.keyRef,
    keyVersion: masterKey.keyVersion,
    ciphertextSha256,
    encryptedPayload: {
      version: masterKey.keyRef,
      iv_base64: iv.toString("base64"),
      ciphertext_base64: ciphertext.toString("base64"),
      auth_tag_base64: authTag.toString("base64"),
      redaction_status: "REDACTED_AT_SOURCE"
    }
  };
}

function objectField(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayField(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableStringField(value: unknown) {
  return typeof value === "string" ? value : null;
}

function booleanField(value: unknown) {
  return value === true;
}

function findSecretMaterialReference(value: unknown, path = "payload"): string | null {
  if (typeof value === "string") {
    return SECRET_MATERIAL_VALUE_PATTERN.test(value) ? path : null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSecretMaterialReference(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`;
    if (SECRET_MATERIAL_KEY_PATTERN.test(key)) return nextPath;
    const found = findSecretMaterialReference(entry, nextPath);
    if (found) return found;
  }

  return null;
}

function validateNoSecretMaterial(value: unknown, context: string) {
  const leakedPath = findSecretMaterialReference(value);

  if (!leakedPath) {
    return {
      state: "ready" as const
    };
  }

  return {
    state: "blocked" as const,
    reason: `PHASE073_REDACTION_GUARD_BLOCKED:${context}:${leakedPath}`
  };
}

function normalizeProvider(row: Record<string, unknown>): Phase070ProviderCatalogItem | null {
  const providerCode = stringField(row.provider_code);
  const providerName = stringField(row.provider_name);
  const providerCategory = stringField(row.provider_category);
  const authType = stringField(row.auth_type);
  const status = stringField(row.status);

  if (!providerCode || !providerName || !providerCategory || !authType || !status) return null;

  return {
    provider_code: providerCode,
    provider_name: providerName,
    provider_category: providerCategory,
    auth_type: authType,
    status,
    capabilities: arrayField(row.capabilities),
    public_metadata: objectField(row.public_metadata),
    created_at: stringField(row.created_at),
    updated_at: stringField(row.updated_at)
  };
}

function normalizeIntegration(row: Record<string, unknown>): Phase070TenantIntegrationStatus | null {
  const organizationId = stringField(row.organization_id);
  const organizationKey = stringField(row.organization_key);
  const providerCode = stringField(row.provider_code);
  const providerName = stringField(row.provider_name);
  const providerCategory = stringField(row.provider_category);
  const integrationKey = stringField(row.integration_key);
  const integrationName = stringField(row.integration_name);
  const status = stringField(row.status);
  const connectionState = stringField(row.connection_state);

  if (!organizationId || !organizationKey || !providerCode || !providerName || !providerCategory || !integrationKey || !integrationName || !status || !connectionState) {
    return null;
  }

  return {
    organization_id: organizationId,
    organization_key: organizationKey,
    provider_code: providerCode,
    provider_name: providerName,
    provider_category: providerCategory,
    integration_key: integrationKey,
    integration_name: integrationName,
    status,
    connection_state: connectionState,
    last_verified_at: nullableStringField(row.last_verified_at),
    credential_configured: booleanField(row.credential_configured),
    public_metadata: objectField(row.public_metadata),
    created_at: stringField(row.created_at),
    updated_at: stringField(row.updated_at)
  };
}

async function fetchPublicReadSurface<T>(accessToken: string, table: string, select: string, normalize: (row: Record<string, unknown>) => T | null) {
  const config = getSupabaseRuntimeConfig();

  if (!config) {
    return {
      state: "blocked" as const,
      reason: "PHASE070_SUPABASE_ENV_MISSING",
      data: [] as T[]
    };
  }

  const endpoint = new URL(`${config.url}/rest/v1/${table}`);
  endpoint.searchParams.set("select", select);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Accept-Profile": "public"
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        state: "blocked" as const,
        reason: `PHASE070_READ_SURFACE_FAILED:${table}:${response.status}:${body || response.statusText}`,
        data: [] as T[]
      };
    }

    const rows = (await response.json().catch(() => [])) as Record<string, unknown>[];
    return {
      state: "ready" as const,
      reason: "PHASE070_READ_SURFACE_LOADED",
      data: rows.map(normalize).filter((item): item is T => Boolean(item))
    };
  } catch (error) {
    return {
      state: "blocked" as const,
      reason: `PHASE070_READ_SURFACE_FETCH_FAILED:${table}:${error instanceof Error ? error.message : String(error)}`,
      data: [] as T[]
    };
  }
}

async function serviceRestRequest<T>(path: string, init: RequestInit & { profile?: string } = {}) {
  const serviceConfig = getRequiredServiceConfig();

  if (serviceConfig.state === "blocked") {
    return {
      state: "blocked" as const,
      reason: serviceConfig.reason,
      data: null as T | null
    };
  }

  const profile = init.profile ?? "tenant_integration_vault";
  const response = await fetch(`${serviceConfig.config.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceConfig.config.serviceRoleKey,
      Authorization: `Bearer ${serviceConfig.config.serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": profile,
      "Content-Profile": profile,
      Prefer: "return=representation",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      state: "blocked" as const,
      reason: `PHASE071_SERVICE_REST_FAILED:${response.status}:${body || response.statusText}`,
      data: null as T | null
    };
  }

  return {
    state: "ready" as const,
    reason: "PHASE071_SERVICE_REST_OK",
    data: (await response.json().catch(() => null)) as T | null
  };
}

async function serviceRpcRequest<T>(rpcName: string, payload: Record<string, unknown>) {
  const serviceConfig = getRequiredServiceConfig();

  if (serviceConfig.state === "blocked") {
    return {
      state: "blocked" as const,
      reason: serviceConfig.reason,
      data: null as T | null
    };
  }

  const response = await fetch(`${serviceConfig.config.url}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: serviceConfig.config.serviceRoleKey,
      Authorization: `Bearer ${serviceConfig.config.serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": "public",
      "Content-Profile": "public"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      state: "blocked" as const,
      reason: `PHASE074_RUNTIME_RPC_FAILED:${rpcName}:${response.status}:${body || response.statusText}`,
      data: null as T | null
    };
  }

  return {
    state: "ready" as const,
    reason: "PHASE074_RUNTIME_RPC_OK",
    data: (await response.json().catch(() => null)) as T | null
  };
}

function getApprovedRuntimeRpc(operation: Exclude<RuntimeOperation, "broker_call">) {
  if (PHASE074_RUNTIME_RPC_CONTRACT !== "APPROVED") {
    return {
      state: "blocked" as const,
      reason: "PHASE074_TENANT_INTEGRATION_RUNTIME_RPC_CONTRACT_NOT_APPROVED"
    };
  }

  const rpcNameByOperation = {
    create: PHASE074_CREATE_RPC,
    rotate: PHASE074_ROTATE_RPC,
    revoke: PHASE074_REVOKE_RPC
  } satisfies Record<Exclude<RuntimeOperation, "broker_call">, string>;
  const rpcName = rpcNameByOperation[operation];

  if (!rpcName) {
    return {
      state: "blocked" as const,
      reason: `PHASE074_TENANT_INTEGRATION_${operation.toUpperCase()}_RPC_MISSING`
    };
  }

  return {
    state: "ready" as const,
    rpcName
  };
}

function normalizeRuntimeRpcReceipt(data: unknown, operation: RuntimeOperation) {
  const row = Array.isArray(data) ? data[0] : data;
  const object = objectField(row);
  const receiptRef = stringField(object.receipt_ref) || `phase074:${operation}:opaque:${Date.now()}`;
  const receiptState = stringField(object.receipt_state);

  return {
    receipt_ref: receiptRef,
    receipt_state: operation === "revoke" ? ("revoked" as const) : receiptState === "revoked" ? ("revoked" as const) : ("issued" as const),
    redaction_status: "NO_SECRET_MATERIAL_RETURNED" as const
  };
}

function eq(value: string) {
  return `eq.${encodeURIComponent(value)}`;
}

async function findProviderByCode(providerCode: string) {
  return serviceRestRequest<Record<string, unknown>[]>(
    `integration_providers?provider_code=${eq(providerCode)}&select=id,provider_code,status`,
    { method: "GET" }
  );
}

async function findTenantIntegration(organizationId: string, integrationKey: string) {
  return serviceRestRequest<Record<string, unknown>[]>(
    `tenant_integrations?organization_id=${eq(organizationId)}&integration_key=${eq(integrationKey)}&select=id,organization_id,integration_key,status,current_secret_blob_id`,
    { method: "GET" }
  );
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function signBrokerPayload(payload: unknown, secret: string) {
  if (!secret) {
    return {
      state: "blocked" as const,
      reason: "PHASE071_BROKER_DOWNSTREAM_SECRET_MISSING"
    };
  }

  return {
    state: "ready" as const,
    signature: createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
  };
}

function getDownstreamContract() {
  if (PHASE072_LIVE_BROKER_AUTHORITY !== "APPROVED") {
    return {
      state: "blocked" as const,
      reason: "PHASE072_TENANT_INTEGRATION_LIVE_BROKER_AUTHORITY_NOT_APPROVED"
    };
  }

  if (PHASE072_ENCRYPTION_KEY_AUTHORITY !== "APPROVED") {
    return {
      state: "blocked" as const,
      reason: "PHASE072_TENANT_INTEGRATION_ENCRYPTION_KEY_AUTHORITY_NOT_APPROVED"
    };
  }

  if (PHASE072_DOWNSTREAM_CONTRACT !== "APPROVED") {
    return {
      state: "blocked" as const,
      reason: "PHASE072_BROKER_DOWNSTREAM_CONTRACT_NOT_APPROVED"
    };
  }

  if (!PHASE072_DOWNSTREAM_URL || !PHASE072_DOWNSTREAM_URL.startsWith("https://")) {
    return {
      state: "blocked" as const,
      reason: "PHASE072_BROKER_DOWNSTREAM_URL_MISSING_OR_UNSAFE"
    };
  }

  if (!PHASE072_DOWNSTREAM_SECRET) {
    return {
      state: "blocked" as const,
      reason: "PHASE072_BROKER_DOWNSTREAM_SECRET_MISSING"
    };
  }

  return {
    state: "ready" as const,
    url: PHASE072_DOWNSTREAM_URL,
    secret: PHASE072_DOWNSTREAM_SECRET
  };
}

export async function loadTenantIntegrations(headers: Headers | HeadersInit): Promise<TenantIntegrationsLoadResult> {
  const accessToken = readPortalAccessToken(headers);
  const user = await verifySupabaseAccessToken(accessToken);

  if (!accessToken || !user) {
    return {
      state: "blocked",
      reason: "PHASE070_PORTAL_SESSION_REQUIRED",
      providers: [],
      integrations: [],
      organization: null
    };
  }

  const organizationContext = await loadPortalOrganizationContext(accessToken, user.id);
  if (organizationContext.state === "blocked") {
    return {
      state: "blocked",
      reason: organizationContext.reason,
      providers: [],
      integrations: [],
      organization: null
    };
  }

  const [providersResult, integrationsResult] = await Promise.all([
    fetchPublicReadSurface(
      accessToken,
      "phase070_integration_provider_catalog",
      "provider_code,provider_name,provider_category,auth_type,status,capabilities,public_metadata,created_at,updated_at",
      normalizeProvider
    ),
    fetchPublicReadSurface(
      accessToken,
      "phase070_tenant_integration_status",
      "organization_id,organization_key,provider_code,provider_name,provider_category,integration_key,integration_name,status,connection_state,last_verified_at,credential_configured,public_metadata,created_at,updated_at",
      normalizeIntegration
    )
  ]);

  if (providersResult.state === "blocked") {
    return {
      state: "blocked",
      reason: providersResult.reason,
      providers: [],
      integrations: [],
      organization: null
    };
  }

  if (integrationsResult.state === "blocked") {
    return {
      state: "blocked",
      reason: integrationsResult.reason,
      providers: [],
      integrations: [],
      organization: null
    };
  }

  return {
    state: "ready",
    reason: "PHASE070_TENANT_INTEGRATIONS_LOADED",
    providers: providersResult.data,
    integrations: integrationsResult.data,
    organization: {
      organization_id: organizationContext.active_membership.organization_id,
      organization_key: organizationContext.active_membership.organization_key,
      organization_name: organizationContext.active_membership.organization_name,
      role: organizationContext.active_membership.role
    }
  };
}

function blockedReceipt(operation: string, reason: string): WriteBlockedResult {
  return {
    state: "blocked",
    reason,
    receipt: {
      receipt_ref: `phase070:${operation}:blocked:${reason.toLowerCase()}`,
      receipt_state: "blocked",
      redaction_status: "NO_SECRET_MATERIAL_RETURNED"
    }
  };
}

export async function blockTenantIntegrationSecretMutation(headers: Headers | HeadersInit, operation: string, integrationKey?: string): Promise<WriteBlockedResult> {
  const loaded = await loadTenantIntegrations(headers);

  if (loaded.state === "blocked") {
    return blockedReceipt(operation, loaded.reason);
  }

  if (!TENANT_INTEGRATION_AUTHORITY_ROLES.has(loaded.organization.role)) {
    return blockedReceipt(operation, "PHASE070_TENANT_INTEGRATION_AUTHORITY_REQUIRED");
  }

  if (integrationKey) {
    const scopedIntegration = loaded.integrations.find((integration) => integration.integration_key === integrationKey);

    if (!scopedIntegration) {
      return blockedReceipt(operation, "PHASE070_TENANT_INTEGRATION_SCOPE_MISSING");
    }

    if (scopedIntegration.organization_id !== loaded.organization.organization_id) {
      return blockedReceipt(operation, "PHASE070_TENANT_INTEGRATION_SCOPE_MISMATCH");
    }
  }

  return {
    state: "blocked",
    reason: "PHASE070_GATEKEEPER_REQUIRED_FOR_SECRET_WRITE_AND_BROKER_RUNTIME",
    receipt: {
      receipt_ref: `phase070:${operation}:blocked:gatekeeper_required`,
      receipt_state: "blocked",
      redaction_status: "NO_SECRET_MATERIAL_RETURNED"
    }
  };
}

export type Phase070BrokerRuntimeResult =
  | {
      state: "ready";
      reason: "PHASE070_BROKER_RUNTIME_SCAFFOLD_READY";
      receipt: {
        receipt_ref: string;
        receipt_state: "issued";
        redaction_status: "NO_SECRET_MATERIAL_RETURNED";
        broker_status: "SCAFFOLD_ONLY" | "DOWNSTREAM_ACCEPTED" | "LIVE_DOWNSTREAM_ACCEPTED";
        downstream_status?: number;
        downstream_result_ref?: string;
      };
    }
  | WriteBlockedResult;

type SecretRuntimePayload = {
  provider_code?: unknown;
  integration_key?: unknown;
  integration_name?: unknown;
  secret_material?: unknown;
};

type RuntimeReceiptResult =
  | {
      state: "ready";
      reason: string;
      receipt: {
        receipt_ref: string;
        receipt_state: "issued" | "revoked";
        redaction_status: "NO_SECRET_MATERIAL_RETURNED";
      };
    }
  | WriteBlockedResult;

function requiredPayloadString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function ensureRuntimeAllowed(headers: Headers | HeadersInit, operation: RuntimeOperation, integrationKey?: string) {
  const scopeCheck = await blockTenantIntegrationSecretMutation(headers, `${operation}_scope_check`, integrationKey);

  if (scopeCheck.reason !== "PHASE070_GATEKEEPER_REQUIRED_FOR_SECRET_WRITE_AND_BROKER_RUNTIME") {
    return scopeCheck;
  }

  const runtimeAuthority = getRuntimeAuthority();
  if (runtimeAuthority.state === "blocked") {
    return blockedReceipt(operation, runtimeAuthority.reason);
  }

  const loaded = await loadTenantIntegrations(headers);
  if (loaded.state === "blocked") {
    return blockedReceipt(operation, loaded.reason);
  }

  return {
    state: "ready" as const,
    tenant: loaded
  };
}

async function insertAuditEvent(input: {
  organizationId: string;
  tenantIntegrationId?: string | null;
  secretBlobId?: string | null;
  receiptId?: string | null;
  action: string;
  result: "PASS" | "BLOCK" | "FAIL";
  reason?: string | null;
}) {
  const event = {
    organization_id: input.organizationId,
    tenant_integration_id: input.tenantIntegrationId ?? null,
    secret_blob_id: input.secretBlobId ?? null,
    receipt_id: input.receiptId ?? null,
    actor_type: "SERVICE",
    actor_ref: "nextjs:tenant-integration-runtime",
    action: input.action,
    result: input.result,
    reason: input.reason ?? null,
    event_hash: stableHash({
      organization_id: input.organizationId,
      tenant_integration_id: input.tenantIntegrationId ?? null,
      secret_blob_id: input.secretBlobId ?? null,
      receipt_id: input.receiptId ?? null,
      action: input.action,
      result: input.result,
      reason: input.reason ?? null,
      created_at: new Date().toISOString()
    })
  };

  await serviceRestRequest<Record<string, unknown>[]>("integration_access_audit", {
    method: "POST",
    body: JSON.stringify(event)
  });
}

async function blockBrokerCallWithAudit(input: {
  organizationId: string;
  tenantIntegrationId: string;
  reason: string;
  result?: "BLOCK" | "FAIL";
}) {
  await insertAuditEvent({
    organizationId: input.organizationId,
    tenantIntegrationId: input.tenantIntegrationId,
    action: "ACCESS_BLOCKED",
    result: input.result ?? "BLOCK",
    reason: input.reason
  });

  return blockedReceipt("broker_call", input.reason);
}

async function issueSecretReceipt(input: { integrationId: string; secretBlobId: string; operation: RuntimeOperation }) {
  const receiptRef = `phase071:${input.operation}:${input.integrationId}:${Date.now()}`;
  const result = await serviceRestRequest<Record<string, unknown>[]>("integration_secret_receipts", {
    method: "POST",
    body: JSON.stringify({
      tenant_integration_id: input.integrationId,
      secret_blob_id: input.secretBlobId,
      receipt_ref: receiptRef,
      receipt_state: input.operation === "revoke" ? "revoked" : "issued",
      issued_by_actor_type: "SERVICE",
      issued_by_actor_ref: "nextjs:tenant-integration-runtime",
      metadata: {
        redaction_status: "NO_SECRET_MATERIAL_RETURNED",
        operation: input.operation
      }
    })
  });

  if (result.state === "blocked" || !Array.isArray(result.data) || !result.data[0]) {
    return {
      state: "blocked" as const,
      reason: result.state === "blocked" ? result.reason : "PHASE071_RECEIPT_INSERT_FAILED"
    };
  }

  return {
    state: "ready" as const,
    receiptId: stringField(result.data[0].id),
    receiptRef,
    receiptState: input.operation === "revoke" ? ("revoked" as const) : ("issued" as const)
  };
}

async function getNextSecretRevision(integrationId: string) {
  const result = await serviceRestRequest<Record<string, unknown>[]>(
    `integration_secret_blobs?tenant_integration_id=${eq(integrationId)}&select=secret_revision&order=secret_revision.desc&limit=1`,
    { method: "GET" }
  );

  if (result.state === "blocked") return result;
  const current = Array.isArray(result.data) && typeof result.data[0]?.secret_revision === "number" ? result.data[0].secret_revision : 0;

  return {
    state: "ready" as const,
    revision: current + 1
  };
}

async function writeEncryptedSecret(input: {
  integrationId: string;
  secretMaterial: string;
  operation: RuntimeOperation;
}) {
  const encrypted = encryptSecretMaterial(input.secretMaterial);
  if (encrypted.state === "blocked") return encrypted;

  const revision = await getNextSecretRevision(input.integrationId);
  if (revision.state === "blocked") return revision;

  const blobResult = await serviceRestRequest<Record<string, unknown>[]>("integration_secret_blobs", {
    method: "POST",
    body: JSON.stringify({
      tenant_integration_id: input.integrationId,
      secret_revision: revision.revision,
      encryption_contract_ref: TENANT_SECRET_CONTRACT_REF,
      key_ref: encrypted.keyRef,
      key_version: encrypted.keyVersion,
      encryption_algorithm: "byok_envelope_v1",
      encrypted_secret_payload: encrypted.encryptedPayload,
      ciphertext_sha256: encrypted.ciphertextSha256,
      created_by_actor_type: "SERVICE",
      created_by_actor_ref: "nextjs:tenant-integration-runtime"
    })
  });

  if (blobResult.state === "blocked" || !Array.isArray(blobResult.data) || !blobResult.data[0]) {
    return {
      state: "blocked" as const,
      reason: blobResult.state === "blocked" ? blobResult.reason : "PHASE071_SECRET_BLOB_INSERT_FAILED"
    };
  }

  const secretBlobId = stringField(blobResult.data[0].id);
  const patchResult = await serviceRestRequest<Record<string, unknown>[]>(
    `tenant_integrations?id=${eq(input.integrationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        current_secret_blob_id: secretBlobId,
        status: "configured",
        connection_state: "unverified"
      })
    }
  );

  if (patchResult.state === "blocked") return patchResult;

  const receipt = await issueSecretReceipt({
    integrationId: input.integrationId,
    secretBlobId,
    operation: input.operation
  });

  if (receipt.state === "blocked") return receipt;

  return {
    state: "ready" as const,
    secretBlobId,
    receiptId: receipt.receiptId,
    receiptRef: receipt.receiptRef,
    receiptState: receipt.receiptState
  };
}

export async function runTenantIntegrationBrokerScaffold(headers: Headers | HeadersInit, integrationKey: string): Promise<Phase070BrokerRuntimeResult> {
  const scopeCheck = await blockTenantIntegrationSecretMutation(headers, "broker_scope_check", integrationKey);

  if (scopeCheck.reason !== "PHASE070_GATEKEEPER_REQUIRED_FOR_SECRET_WRITE_AND_BROKER_RUNTIME") {
    return scopeCheck;
  }

  if (PHASE070_BROKER_RUNTIME_AUTHORITY !== "APPROVED") {
    return blockedReceipt("broker_call", "PHASE070_BROKER_RUNTIME_AUTHORITY_NOT_APPROVED");
  }

  return {
    state: "ready",
    reason: "PHASE070_BROKER_RUNTIME_SCAFFOLD_READY",
    receipt: {
      receipt_ref: `phase070:broker_call:scaffold:${integrationKey}`,
      receipt_state: "issued",
      redaction_status: "NO_SECRET_MATERIAL_RETURNED",
      broker_status: "SCAFFOLD_ONLY"
    }
  };
}

export async function createTenantIntegrationRuntime(headers: Headers | HeadersInit, payload: SecretRuntimePayload): Promise<RuntimeReceiptResult> {
  const providerCode = requiredPayloadString(payload.provider_code);
  const integrationKey = requiredPayloadString(payload.integration_key);
  const integrationName = requiredPayloadString(payload.integration_name);
  const secretMaterial = requiredPayloadString(payload.secret_material);

  if (!providerCode || !integrationKey || !integrationName || !secretMaterial) {
    return blockedReceipt("create", "PHASE071_REQUIRED_FIELDS_MISSING");
  }

  const allowed = await ensureRuntimeAllowed(headers, "create");
  if (allowed.state === "blocked") return allowed;

  const rpc = getApprovedRuntimeRpc("create");
  if (rpc.state === "blocked") return blockedReceipt("create", rpc.reason);

  const encrypted = encryptSecretMaterial(secretMaterial);
  if (encrypted.state === "blocked") return blockedReceipt("create", encrypted.reason);

  const rpcResult = await serviceRpcRequest<Record<string, unknown>>(rpc.rpcName, {
    payload: {
      organization_id: allowed.tenant.organization.organization_id,
      provider_code: providerCode,
      integration_key: integrationKey,
      integration_name: integrationName,
      encryption_contract_ref: TENANT_SECRET_CONTRACT_REF,
      encryption_algorithm: "byok_envelope_v1",
      key_ref: encrypted.keyRef,
      key_version: encrypted.keyVersion,
      encrypted_secret_payload: encrypted.encryptedPayload,
      ciphertext_sha256: encrypted.ciphertextSha256,
      actor_type: "SERVICE",
      actor_ref: "nextjs:tenant-integration-runtime"
    }
  });

  if (rpcResult.state === "blocked") return blockedReceipt("create", rpcResult.reason);

  return {
    state: "ready",
    reason: "PHASE074_TENANT_INTEGRATION_CREATED_VIA_RPC",
    receipt: normalizeRuntimeRpcReceipt(rpcResult.data, "create")
  };
}

export async function rotateTenantIntegrationRuntime(headers: Headers | HeadersInit, integrationKey: string, payload: SecretRuntimePayload): Promise<RuntimeReceiptResult> {
  const secretMaterial = requiredPayloadString(payload.secret_material);

  if (!secretMaterial) {
    return blockedReceipt("rotate", "PHASE071_SECRET_MATERIAL_REQUIRED");
  }

  const allowed = await ensureRuntimeAllowed(headers, "rotate", integrationKey);
  if (allowed.state === "blocked") return allowed;

  const rpc = getApprovedRuntimeRpc("rotate");
  if (rpc.state === "blocked") return blockedReceipt("rotate", rpc.reason);

  const encrypted = encryptSecretMaterial(secretMaterial);
  if (encrypted.state === "blocked") return blockedReceipt("rotate", encrypted.reason);

  const rpcResult = await serviceRpcRequest<Record<string, unknown>>(rpc.rpcName, {
    payload: {
      organization_id: allowed.tenant.organization.organization_id,
      integration_key: integrationKey,
      encryption_contract_ref: TENANT_SECRET_CONTRACT_REF,
      encryption_algorithm: "byok_envelope_v1",
      key_ref: encrypted.keyRef,
      key_version: encrypted.keyVersion,
      encrypted_secret_payload: encrypted.encryptedPayload,
      ciphertext_sha256: encrypted.ciphertextSha256,
      actor_type: "SERVICE",
      actor_ref: "nextjs:tenant-integration-runtime"
    }
  });

  if (rpcResult.state === "blocked") return blockedReceipt("rotate", rpcResult.reason);

  return {
    state: "ready",
    reason: "PHASE074_TENANT_INTEGRATION_ROTATED_VIA_RPC",
    receipt: normalizeRuntimeRpcReceipt(rpcResult.data, "rotate")
  };
}

export async function revokeTenantIntegrationRuntime(headers: Headers | HeadersInit, integrationKey: string): Promise<RuntimeReceiptResult> {
  const allowed = await ensureRuntimeAllowed(headers, "revoke", integrationKey);
  if (allowed.state === "blocked") return allowed;

  const rpc = getApprovedRuntimeRpc("revoke");
  if (rpc.state === "blocked") return blockedReceipt("revoke", rpc.reason);

  const rpcResult = await serviceRpcRequest<Record<string, unknown>>(rpc.rpcName, {
    payload: {
      organization_id: allowed.tenant.organization.organization_id,
      integration_key: integrationKey,
      actor_type: "SERVICE",
      actor_ref: "nextjs:tenant-integration-runtime"
    }
  });

  if (rpcResult.state === "blocked") return blockedReceipt("revoke", rpcResult.reason);

  return {
    state: "ready",
    reason: "PHASE074_TENANT_INTEGRATION_REVOKED_VIA_RPC",
    receipt: normalizeRuntimeRpcReceipt(rpcResult.data, "revoke")
  };
}

export async function brokerCallTenantIntegrationRuntime(headers: Headers | HeadersInit, integrationKey: string): Promise<Phase070BrokerRuntimeResult> {
  const allowed = await ensureRuntimeAllowed(headers, "broker_call", integrationKey);
  if (allowed.state === "blocked") return allowed;

  const downstream = getDownstreamContract();
  if (downstream.state === "blocked") {
    return blockedReceipt("broker_call", downstream.reason);
  }

  const integration = await findTenantIntegration(allowed.tenant.organization.organization_id, integrationKey);
  if (integration.state === "blocked") return blockedReceipt("broker_call", integration.reason);

  const row = Array.isArray(integration.data) ? integration.data[0] : null;
  const integrationId = row ? stringField(row.id) : "";
  const integrationStatus = row ? stringField(row.status) : "";
  const currentSecretBlobId = row ? stringField(row.current_secret_blob_id) : "";

  if (!integrationId) {
    return blockedReceipt("broker_call", "PHASE071_TENANT_INTEGRATION_NOT_FOUND");
  }

  if (integrationStatus !== "configured") {
    return blockedReceipt("broker_call", "PHASE072_LIVE_BROKER_INTEGRATION_NOT_CONFIGURED");
  }

  if (!currentSecretBlobId) {
    return blockedReceipt("broker_call", "PHASE072_LIVE_BROKER_SECRET_BLOB_MISSING");
  }

  const receiptRef = `phase072:broker_call:opaque:${integrationKey}:${Date.now()}`;
  const downstreamPayload = {
    receipt_ref: receiptRef,
    organization_id: allowed.tenant.organization.organization_id,
    organization_key: allowed.tenant.organization.organization_key,
    integration_key: integrationKey,
    tenant_integration_ref: integrationId,
    broker_mode: "OPAQUE_NO_SECRET",
    redaction_status: "NO_SECRET_MATERIAL_RETURNED",
    contract_ref: "phase072_live_broker_downstream_v1",
    requested_at: new Date().toISOString()
  };
  const payloadRedaction = validateNoSecretMaterial(downstreamPayload, "downstream_payload");

  if (payloadRedaction.state === "blocked") {
    return blockBrokerCallWithAudit({
      organizationId: allowed.tenant.organization.organization_id,
      tenantIntegrationId: integrationId,
      reason: payloadRedaction.reason
    });
  }

  const signature = signBrokerPayload(downstreamPayload, downstream.secret);

  if (signature.state === "blocked") {
    return blockBrokerCallWithAudit({
      organizationId: allowed.tenant.organization.organization_id,
      tenantIntegrationId: integrationId,
      reason: signature.reason
    });
  }

  let downstreamResponse: Response;
  try {
    downstreamResponse = await fetch(downstream.url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-PN-Broker-Signature": signature.signature
      },
      body: JSON.stringify(downstreamPayload)
    });
  } catch (error) {
    return blockBrokerCallWithAudit({
      organizationId: allowed.tenant.organization.organization_id,
      tenantIntegrationId: integrationId,
      reason: `PHASE073_BROKER_DOWNSTREAM_FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`,
      result: "FAIL"
    });
  }

  if (!downstreamResponse.ok) {
    return blockBrokerCallWithAudit({
      organizationId: allowed.tenant.organization.organization_id,
      tenantIntegrationId: integrationId,
      reason: `PHASE073_BROKER_DOWNSTREAM_REJECTED:${downstreamResponse.status}`,
      result: "FAIL"
    });
  }

  const downstreamResultRef = downstreamResponse.headers.get("x-pn-result-ref") ?? receiptRef;
  const receipt = {
    receipt_ref: receiptRef,
    receipt_state: "issued" as const,
    redaction_status: "NO_SECRET_MATERIAL_RETURNED" as const,
    broker_status: "LIVE_DOWNSTREAM_ACCEPTED" as const,
    downstream_status: downstreamResponse.status,
    downstream_result_ref: downstreamResultRef
  };
  const receiptRedaction = validateNoSecretMaterial(receipt, "broker_receipt");

  if (receiptRedaction.state === "blocked") {
    return blockBrokerCallWithAudit({
      organizationId: allowed.tenant.organization.organization_id,
      tenantIntegrationId: integrationId,
      reason: receiptRedaction.reason
    });
  }

  await insertAuditEvent({
    organizationId: allowed.tenant.organization.organization_id,
    tenantIntegrationId: integrationId,
    action: "SECRET_RECEIPT_CONSUMED",
    result: "PASS",
    reason: "PHASE071_BROKER_DOWNSTREAM_ACCEPTED"
  });

  return {
    state: "ready",
    reason: "PHASE070_BROKER_RUNTIME_SCAFFOLD_READY",
    receipt
  };
}
