type N8nResult = {
  ok: boolean;
  mocked: boolean;
  route: string;
  status: number;
  message: string;
  response?: unknown;
};

export async function postN8nWebhook(route: string, payload: unknown): Promise<N8nResult> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, "");
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();

  if (!baseUrl) {
    return {
      ok: true,
      mocked: true,
      route,
      status: 200,
      message: "Mock n8n response: webhook base URL is not configured."
    };
  }

  const url = `${baseUrl}/${route.replace(/^\//, "")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-webhook-secret": secret } : {})
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return {
    ok: response.ok,
    mocked: false,
    route,
    status: response.status,
    message: response.ok ? "n8n webhook completed." : "n8n webhook returned an error.",
    response: parsed
  };
}
