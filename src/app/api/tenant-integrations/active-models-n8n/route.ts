import { NextResponse } from "next/server";
import { consumeReferenceToken } from "@/lib/byok-secret-broker";
import { createServiceRoleClient } from "@/lib/supabase-server";

type ActiveModelConfig = {
  state: "ready" | "blocked";
  reason?: string;
  image?: { provider: string; model: string };
  text?: { provider: string; model: string };
};

function readRuntimeAuth(request: Request) {
  return (
    request.headers.get("x-n8n-api-key")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    ""
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");
  const referenceToken = searchParams.get("reference_token")?.trim() || "";
  console.error("[active-models-n8n] incoming", {
    organizationId,
    hasReferenceToken: Boolean(referenceToken),
    authHeaderPresent: Boolean(readRuntimeAuth(request))
  });

  if (!organizationId) {
    return NextResponse.json(
      { state: "blocked", reason: "MISSING_ORGANIZATION_ID" },
      { status: 400 }
    );
  }

  if (!referenceToken) {
    return NextResponse.json(
      { state: "blocked", reason: "MISSING_REFERENCE_TOKEN" },
      { status: 400 }
    );
  }

  const runtimeApiKey = (process.env.N8N_API_KEY || "").trim();
  const authHeader = readRuntimeAuth(request);

  if (!runtimeApiKey || authHeader !== runtimeApiKey) {
    return NextResponse.json(
      { state: "blocked", reason: "UNAUTHORIZED_N8N_KEY" },
      { status: 401 }
    );
  }

  const consumedToken = await consumeReferenceToken(referenceToken, {
    actorType: "N8N",
    actorRef: "n8n:active-models"
  });
  console.error("[active-models-n8n] token redeemed", {
    credentialRef: consumedToken.credential_ref,
    expiresAt: consumedToken.expires_at
  });

  const credentialParts = String(consumedToken.credential_ref || "").split("__");
  const tokenOrgId = credentialParts[0] || "";
  const tokenIntegrationKey = credentialParts[2] || "";
  const normalizedRequestOrg = organizationId.replace(/-/g, "");

  if (!tokenOrgId || tokenOrgId !== normalizedRequestOrg) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "TENANT_SCOPE_MISMATCH"
      },
      { status: 403 }
    );
  }

  if (!tokenIntegrationKey) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "MISSING_INTEGRATION_KEY"
      },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  console.error("[active-models-n8n] lookup start", {
    organizationId,
    tokenOrgId,
    tokenIntegrationKey
  });

  const { data: integrationRow, error: integrationError } = await supabase.rpc(
    "phase077_get_active_tenant_integration_n8n",
    {
      p_organization_id: organizationId,
      p_integration_key: tokenIntegrationKey
    }
  );

  if (integrationError) {
    console.error("[active-models-n8n] integration lookup error", {
      message: integrationError.message,
      details: integrationError.details,
      hint: integrationError.hint,
      code: integrationError.code
    });
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: ${integrationError.message || "INTEGRATION_LOOKUP_FAILED"}`
      },
      { status: 500 }
    );
  }

  if (!integrationRow) {
    console.error("[active-models-n8n] integration lookup empty", {
      organizationId,
      tokenIntegrationKey
    });
    return NextResponse.json(
      {
        state: "blocked",
        reason: `NO_ACTIVE_TENANT_INTEGRATION: organization_id=${organizationId}`
      },
      { status: 200 }
    );
  }

  console.error("[active-models-n8n] integration row", {
    integrationId: (integrationRow as Record<string, unknown>).integration_id,
    providerCode: (integrationRow as Record<string, unknown>).provider_code,
    status: (integrationRow as Record<string, unknown>).status,
    connectionState: (integrationRow as Record<string, unknown>).connection_state,
    publicMetadataKeys: Object.keys(((integrationRow as Record<string, unknown>).public_metadata || {}) as Record<string, unknown>)
  });
  const providerCode = String((integrationRow as Record<string, unknown>).provider_code || "");
  if (!providerCode) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: MISSING_PROVIDER_CODE`
      },
      { status: 500 }
    );
  }

  if (credentialParts[1] && credentialParts[1] !== providerCode) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "PROVIDER_SCOPE_MISMATCH"
      },
      { status: 403 }
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
