import { postN8nWebhook } from "@/lib/n8n-client";

export async function handleN8nContract(route: string, payload: unknown) {
  const result = await postN8nWebhook(route, payload);
  return Response.json(
    {
      ...result,
      webhookRoute: route,
      receivedAt: new Date().toISOString()
    },
    { status: result.status }
  );
}
