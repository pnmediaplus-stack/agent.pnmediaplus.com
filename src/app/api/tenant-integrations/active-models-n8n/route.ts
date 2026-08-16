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
    const consumedToken = await consumeReferenceToken(referenceToken, { actorType: "N8N", actorRef: "n8n:active-models" });
    const credentialParts = String(consumedToken.credential_ref || "").split("__");
    const tokenOrgId = credentialParts[0] || "";
    const normalizedRequestOrg = organizationId.replace(/-/g, "");

    if (!tokenOrgId || tokenOrgId !== normalizedRequestOrg) {
      return NextResponse.json({ state: "blocked", reason: "TENANT_SCOPE_MISMATCH" }, { status: 403 });
    }
  } catch (error: any) {
    const isTokenNotUsable = error.message?.includes("TOKEN_NOT_USABLE");
    return NextResponse.json(
      { state: "blocked", reason: isTokenNotUsable ? "REFERENCE_TOKEN_ALREADY_CONSUMED" : `REFERENCE_TOKEN_CONSUME_FAILED: ${error.message}` },
      { status: isTokenNotUsable ? 409 : 500 }
    );
  }

  const supabase = createServiceRoleClient();
  
  // Fetch ALL configured integrations
  const { data: activeIntegrations, error: integrationError } = await supabase
    .from("phase070_tenant_integration_status")
    .select("integration_key, provider_code, public_metadata")
    .eq("organization_id", organizationId)
    .eq("credential_configured", true)
    .eq("connection_state", "healthy");

  if (integrationError) {
    return NextResponse.json({ state: "blocked", reason: "ACTIVE_MODELS_LOOKUP_FAILED" }, { status: 500 });
  }

  const { data: providerCatalogRows } = await supabase
    .schema("tenant_integration_vault")
    .from("integration_providers")
    .select("provider_code, public_metadata")
    .eq("status", "active");

  const providerRows = Array.isArray(providerCatalogRows) ? providerCatalogRows : [];

  let finalImageBinding: any = null;
  let finalTextBinding: any = null;

  for (const integration of activeIntegrations || []) {
    const meta = (integration.public_metadata || {}) as Record<string, any>;
    const bindings = (meta.bindings || {}) as Record<string, any>;

    const prefImage = bindings.image_lane?.model_code || (typeof meta.preferred_image_model === "string" ? meta.preferred_image_model : "");
    if (!finalImageBinding && prefImage) {
      const resolved = resolveLaneProviderBinding(providerRows, "image", prefImage);
      if (resolved && resolved.provider === integration.provider_code) {
        finalImageBinding = { provider_code: resolved.provider, capability: "image", model_code: resolved.model, lane_key: "image_lane" };
      }
    }

    const prefText = bindings.text_lane?.model_code || (typeof meta.preferred_text_model === "string" ? meta.preferred_text_model : "");
    if (!finalTextBinding && prefText) {
      const resolved = resolveLaneProviderBinding(providerRows, "text", prefText);
      if (resolved && resolved.provider === integration.provider_code) {
        finalTextBinding = { provider_code: resolved.provider, capability: "text", model_code: resolved.model, lane_key: "text_lane" };
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
    provider_bindings: {
      text: finalTextBinding,
      image: finalImageBinding
    }
  }, { status: 200 });
}
