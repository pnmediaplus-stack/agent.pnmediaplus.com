import { postN8nWebhook } from "@/lib/n8n-client";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  try {
    const result = await postN8nWebhook("audit-log-append", {
      received: true,
      payload
    });

    return Response.json(
      {
        ok: result.ok,
        mocked: result.mocked,
        route: "audit-log-append",
        status: result.status,
        message: result.message,
        data: result.response ?? null,
        receivedAt: new Date().toISOString()
      },
      { status: result.status }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        mocked: false,
        route: "audit-log-append",
        status: 502,
        message: "Control plane approved the request, but n8n forwarding failed.",
        error: error instanceof Error ? error.message : String(error),
        receivedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}
