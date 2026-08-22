import { NextResponse } from "next/server";
import { consumeReferenceToken } from "@/lib/byok-secret-broker";
import { resolveLaneProviderBinding } from "@/lib/lane-provider-binding";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");
  const referenceToken = searchParams.get("reference_token")?.trim() || "";
  
  if (!organizationId) {
    return NextResponse.json({ state: "blocked", reason: "MISSING_ORGANIZATION_ID" }, { status: 400 });
  }
  if (!referenceToken) {
    return NextResponse.json({ state: "blocked", reason: "MISSING_REFERENCE_TOKEN" }, { status: 400 });
  }

  const runtimeApiKey = (process.env.N8N_API_KEY || "").trim();
  const authHeader = request.headers.get("x-n8n-api-key")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";

  if (!runtimeApiKey || authHeader !== runtimeApiKey) {
    return NextResponse.json({ state: "blocked", reason: "UNAUTHORIZED_N8N_KEY" }, { status: 401 });
  }

  try {
    const { verifyReferenceToken } = await import("@/lib/byok-secret-broker");
    const verifiedToken = await verifyReferenceToken(referenceToken);
    
    // Check if token has expired
    if (verifiedToken.expires_at && new Date(verifiedToken.expires_at) <= new Date()) {
       return NextResponse.json({ state: "blocked", reason: "REFERENCE_TOKEN_EXPIRED" }, { status: 403 });
    }

    const credentialParts = String(verifiedToken.credential_ref || "").split("__");
    const tokenOrgId = credentialParts[0] || "";
    const normalizedRequestOrg = organizationId.replace(/-/g, "");

    if (!tokenOrgId || tokenOrgId !== normalizedRequestOrg) {
      return NextResponse.json({ state: "blocked", reason: "TENANT_SCOPE_MISMATCH" }, { status: 403 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { state: "blocked", reason: `REFERENCE_TOKEN_VERIFY_FAILED: ${error.message}` },
      { status: 403 }
    );
  }

  const supabase = createServiceRoleClient();
  
  // Fetch ALL configured integrations
  const { data: activeIntegrations, error: integrationError } = await supabase.rpc(
    "phase077_get_all_active_tenant_integrations",
    { p_organization_id: organizationId }
  );

  if (integrationError) {
    return NextResponse.json({ state: "blocked", reason: "ACTIVE_MODELS_LOOKUP_FAILED" }, { status: 500 });
  }

  const { data: providerCatalogRows } = await supabase.rpc("phase077_get_active_integration_providers");

  const providerRows = Array.isArray(providerCatalogRows) ? providerCatalogRows : [];

  let finalImageBinding: any = null;
  let finalTextBinding: any = null;

  for (const integration of activeIntegrations || []) {
    const meta = (integration.public_metadata || {}) as Record<string, any>;
    const bindings = (meta.bindings || {}) as Record<string, any>;

    const providerId = integration.provider_id;
    const providerCat = providerRows.find((p: any) => p.id === providerId);
    const providerCode = providerCat?.provider_code;

    if (!providerCode) continue;

    const prefImage = bindings.image_lane?.model_code || (typeof meta.preferred_image_model === "string" ? meta.preferred_image_model : "");
    if (!finalImageBinding && prefImage) {
      const resolved = resolveLaneProviderBinding(providerRows, "image", prefImage, providerCode);
      if (resolved && resolved.provider === providerCode) {
        finalImageBinding = { provider_code: resolved.provider, capability: "image", model_code: resolved.model, lane_key: "image_lane", tenant_binding_id: integration.integration_key };
      }
    }

    const prefText = bindings.text_lane?.model_code || (typeof meta.preferred_text_model === "string" ? meta.preferred_text_model : "");
    if (!finalTextBinding && prefText) {
      const resolved = resolveLaneProviderBinding(providerRows, "text", prefText, providerCode);
      if (resolved && resolved.provider === providerCode) {
        finalTextBinding = { provider_code: resolved.provider, capability: "text", model_code: resolved.model, lane_key: "text_lane", tenant_binding_id: integration.integration_key };
      }
    }
  }

  if (!finalImageBinding) {
    return NextResponse.json({ state: "blocked", reason: "IMAGE_LANE_BINDING_MISSING" }, { status: 200 });
  }
  if (!finalTextBinding) {
    return NextResponse.json({ state: "blocked", reason: "TEXT_LANE_BINDING_MISSING" }, { status: 200 });
  }

  return NextResponse.json({
    state: "ready",
    tenant_binding_id: `multi:${finalTextBinding.tenant_binding_id}:${finalImageBinding.tenant_binding_id}`,
    provider_bindings: {
      text: finalTextBinding,
      image: finalImageBinding
    }
  }, { status: 200 });
}
