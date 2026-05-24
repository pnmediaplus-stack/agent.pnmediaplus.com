import { blockTenantIntegrationSecretMutation, isTenantIntegrationRuntimeAuthorityApproved, revokeTenantIntegrationRuntime } from "@/lib/tenant-integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ integrationId: string }> }) {
  const { integrationId } = await context.params;
  const result = isTenantIntegrationRuntimeAuthorityApproved()
    ? await revokeTenantIntegrationRuntime(request.headers, integrationId)
    : await blockTenantIntegrationSecretMutation(request.headers, "revoke", integrationId);
  const status = result.state === "ready" ? 200 : 403;

  return Response.json(
    {
      ok: result.state === "ready",
      state: result.state,
      route: "tenant-integrations.revoke",
      status,
      integration_id: integrationId,
      reason: result.reason,
      data: {
        receipt: result.receipt
      },
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
