import { NextResponse } from "next/server";
import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

type ActiveModelConfig = {
  state: "ready" | "blocked";
  reason?: string;
  image?: { provider: string; model: string };
  text?: { provider: string; model: string };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");

  if (!organizationId) {
    return NextResponse.json(
      { state: "blocked", reason: "MISSING_ORGANIZATION_ID" },
      { status: 400 }
    );
  }

  const accessToken = readPortalAccessToken(request.headers);
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
  const matchingMembership =
    orgContext.state === "ready"
      ? orgContext.memberships.find((membership) => membership.organization_id === organizationId) || null
      : null;

  if (orgContext.state === "blocked" || !matchingMembership) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: `TENANT_SCOPE_INVALID: ${orgContext.reason}`
      },
      { status: 403 }
    );
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { state: "blocked", reason: "SERVER_CONFIGURATION_ERROR" },
      { status: 500 }
    );
  }

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/phase070_get_active_models`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      p_organization_id: organizationId
    })
  });

  if (!rpcResponse.ok) {
    const body = await rpcResponse.text().catch(() => "");
    return NextResponse.json(
      {
        state: "blocked",
        reason: `ACTIVE_MODELS_LOOKUP_FAILED: RPC_${rpcResponse.status}${body ? `:${body}` : ""}`
      },
      { status: 500 }
    );
  }

  const result = (await rpcResponse.json().catch(() => null)) as ActiveModelConfig | null;

  if (!result || typeof result !== "object") {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "ACTIVE_MODELS_LOOKUP_FAILED: INVALID_RPC_RESPONSE"
      },
      { status: 500 }
    );
  }

  if (result.state === "blocked") {
    return NextResponse.json(
      {
        state: "blocked",
        reason: result.reason || "ACTIVE_MODELS_LOOKUP_FAILED"
      },
      { status: 200 }
    );
  }

  if (!result.image?.provider || !result.image?.model) {
    return NextResponse.json(
      {
        state: "blocked",
        reason: "MISSING_IMAGE_MODEL"
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      state: "ready",
      image: result.image,
      text: result.text?.provider && result.text?.model ? result.text : result.image
    },
    { status: 200 }
  );
}
