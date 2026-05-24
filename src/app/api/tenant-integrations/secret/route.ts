import { createTenantIntegrationRuntime } from "@/lib/tenant-integrations";

export const dynamic = "force-dynamic";

function envelope(status: number, body: Record<string, unknown>) {
  return Response.json(
    {
      route: "tenant-integrations.secret",
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

export async function POST(request: Request) {
  const result = await createTenantIntegrationRuntime(request.headers, (await request.json().catch(() => ({}))) as Record<string, unknown>);
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
