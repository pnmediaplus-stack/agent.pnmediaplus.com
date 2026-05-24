import { blockTenantIntegrationSecretMutation, createTenantIntegrationRuntime, isTenantIntegrationRuntimeAuthorityApproved, loadTenantIntegrations } from "@/lib/tenant-integrations";

export const dynamic = "force-dynamic";

function envelope(status: number, body: Record<string, unknown>) {
  return Response.json(
    {
      route: "tenant-integrations",
      status,
      ...body,
      receivedAt: new Date().toISOString()
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function GET(request: Request) {
  const result = await loadTenantIntegrations(request.headers);

  if (result.state === "blocked") {
    return envelope(503, {
      ok: false,
      state: "blocked",
      reason: result.reason,
      data: null
    });
  }

  return envelope(200, {
    ok: true,
    state: "ready",
    reason: result.reason,
    data: {
      organization: result.organization,
      providers: result.providers,
      integrations: result.integrations
    }
  });
}

export async function POST(request: Request) {
  const result = isTenantIntegrationRuntimeAuthorityApproved()
    ? await createTenantIntegrationRuntime(request.headers, (await request.json().catch(() => ({}))) as Record<string, unknown>)
    : await blockTenantIntegrationSecretMutation(request.headers, "create");
  const status = result.state === "ready" ? 201 : 403;

  return envelope(status, {
    ok: result.state === "ready",
    state: result.state,
    reason: result.reason,
    data: {
      receipt: result.receipt
    }
  });
}
