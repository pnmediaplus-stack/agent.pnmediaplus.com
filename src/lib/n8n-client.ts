type N8nResult = {
  ok: boolean;
  mocked: boolean;
  route: string;
  status: number;
  message: string;
  response?: unknown;
  fail_closed?: boolean;
};

export async function postN8nWebhook(route: string, payload: unknown): Promise<N8nResult> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, "");
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();

  if (!baseUrl) {
    return {
      ok: false,
      mocked: false,
      route,
      status: 500,
      message: "BLOCKED: N8N_WEBHOOK_BASE_URL is missing. Failsafe activated.",
      fail_closed: true
    };
  }

  const apiKey = process.env.N8N_CAMPAIGN_PLANNER_API_KEY || process.env.N8N_API_KEY;
  const url = `${baseUrl}/${route.replace(/^\//, "")}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-webhook-secret": secret } : {}),
      ...(apiKey ? { "x-n8n-api-key": apiKey } : {})
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
    response: parsed,
    fail_closed: !response.ok
  };
}
