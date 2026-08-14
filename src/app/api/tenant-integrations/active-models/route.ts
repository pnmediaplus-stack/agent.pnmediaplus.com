import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  loadPortalOrganizationContext,
  readPortalAccessToken,
  verifySupabaseAccessToken
} from "@/lib/portal-auth";

type ActiveModelConfig = {
  state: "ready" | "blocked";
  reason?: string;
  image?: { provider: string; model: string };
  text?: { provider: string; model: string };
};

function readAuthHeader(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");

  if (!organizationId) {
    return NextResponse.json(
      { state: "blocked", reason: "MISSING_ORGANIZATION_ID" },
      { status: 400 }
    );
  }

  const accessToken = readPortalAccessToken(request.headers) || readAuthHeader(request);
  if (!accessToken) {
    return NextResponse.json(
      { state: "blocked", reason: "UNAUTHORIZED_MISSING_TOKEN" },
      { status: 401 }
    );
  }

  const user = await verifySupabaseAccessToken(accessToken);
  if (!user) {
    return NextResponse.json(
      { state: "blocked", reason: "UNAUTHORIZED_INVALID_TOKEN" },
      { status: 401 }
    );
  }

  const orgContext = await loadPortalOrganizationContext(accessToken, user.id);
  if (orgContext.state === "blocked") {
    return NextResponse.json(
      { state: "blocked", reason: `TENANT_SCOPE_INVALID: ${orgContext.reason}` },
      { status: 403 }
    );
  }

  const membership = orgContext.memberships.find((item) => item.organization_id === organizationId);
  if (!membership) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `TENANT_SCOPE_INVALID: organization_id=${organizationId}`
      },
      { status: 403 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: integrationRow, error: integrationError } = await supabase
    .schema("tenant_integration_vault")
    .from("tenant_integrations")
    .select("provider_id, public_metadata, status, connection_state")
    .eq("organization_id", organizationId)
    .eq("status", "configured")
    .eq("connection_state", "healthy")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (integrationError) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: ${integrationError.message || "INTEGRATION_LOOKUP_FAILED"}`
      },
      { status: 500 }
    );
  }

  if (!integrationRow) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `NO_ACTIVE_TENANT_INTEGRATION: organization_id=${organizationId}`
      },
      { status: 200 }
    );
  }

  const providerId = String((integrationRow as Record<string, unknown>).provider_id || "");
  if (!providerId) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: MISSING_PROVIDER_ID`
      },
      { status: 500 }
    );
  }

  const { data: providerRow, error: providerError } = await supabase
    .schema("tenant_integration_vault")
    .from("integration_providers")
    .select("provider_code")
    .eq("id", providerId)
    .limit(1)
    .single();

  if (providerError) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: ${providerError.message || "PROVIDER_LOOKUP_FAILED"}`
      },
      { status: 500 }
    );
  }

  const providerCode = String((providerRow as Record<string, unknown>)?.provider_code || "");
  if (!providerCode) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: MISSING_PROVIDER_CODE`
      },
      { status: 500 }
    );
  }

  const meta = ((integrationRow as Record<string, unknown>).public_metadata || {}) as Record<string, unknown>;
  const preferredImageModel = typeof meta.preferred_image_model === "string" ? meta.preferred_image_model : "";
  const preferredTextModel = typeof meta.preferred_text_model === "string" ? meta.preferred_text_model : "";

  if (!preferredImageModel) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "MISSING_IMAGE_MODEL"
      },
      { status: 200 }
    );
  }

  const image = { provider: providerCode, model: preferredImageModel };
  const text = preferredTextModel ? { provider: providerCode, model: preferredTextModel } : image;

  const result: ActiveModelConfig = {
    state: "ready",
    image,
    text
  };

  return NextResponse.json(result, { status: 200 });
}
