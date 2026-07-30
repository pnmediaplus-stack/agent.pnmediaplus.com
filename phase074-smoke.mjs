import { readFile } from "node:fs/promises";

function parseEnv(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadLocalEnv() {
  const content = await readFile(new URL("./.env.local", import.meta.url), "utf8");
  const env = parseEnv(content);

  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function assertReady(label, value) {
  if (!value) {
    throw new Error(`${label} is missing`);
  }
}

function cookieHeaderFromTokens(accessToken, refreshToken) {
  return [
    `pn_portal_access_token=${encodeURIComponent(accessToken)}`,
    `pn_portal_refresh_token=${encodeURIComponent(refreshToken)}`
  ].join("; ");
}

function supabaseRuntimeConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  assertReady("SUPABASE_URL", url);
  assertReady("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  assertReady("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);

  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

async function serviceRestRequest(path, body) {
  const { url, serviceRoleKey } = supabaseRuntimeConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Profile": "tenant_integration_vault",
      "Content-Profile": "tenant_integration_vault",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Service REST ${path} failed: ${response.status} ${text || response.statusText}`);
  }

  return response.json().catch(() => null);
}

async function main() {
  await loadLocalEnv();

  process.env.PHASE070_BROKER_RUNTIME_AUTHORITY = "APPROVED";
  process.env.PHASE071_TENANT_INTEGRATION_RUNTIME_AUTHORITY = "APPROVED";
  process.env.PHASE071_BROKER_DOWNSTREAM_CONTRACT = "APPROVED";
  process.env.PHASE071_BROKER_DOWNSTREAM_URL = "https://example.invalid";
  process.env.PHASE071_BROKER_DOWNSTREAM_SECRET = "smoke-downstream-secret";
  process.env.PHASE072_TENANT_INTEGRATION_LIVE_BROKER_AUTHORITY = "APPROVED";
  process.env.PHASE072_TENANT_INTEGRATION_ENCRYPTION_KEY_AUTHORITY = "APPROVED";
  process.env.PHASE072_BROKER_DOWNSTREAM_CONTRACT = "APPROVED";
  process.env.PHASE072_BROKER_DOWNSTREAM_URL = "https://example.invalid";
  process.env.PHASE072_BROKER_DOWNSTREAM_SECRET = "smoke-downstream-secret";

  const loginPassword = process.env.PN_PORTAL_SMOKE_PASSWORD || "";
  assertReady("PN_PORTAL_SMOKE_PASSWORD", loginPassword);

  const email = "pnmediaplus@gmail.com";

  const { loginWithSupabasePassword, PORTAL_ACCESS_COOKIE, PORTAL_REFRESH_COOKIE } = await import("./src/lib/portal-auth.ts");
  const { loadTenantIntegrations } = await import("./src/lib/tenant-integrations.ts");
  const { GET: getSession } = await import("./src/app/api/auth/session/route.ts");
  const { POST: postSecret } = await import("./src/app/api/tenant-integrations/secret/route.ts");

  const login = await loginWithSupabasePassword(email, loginPassword);
  if (login.state === "blocked") {
    throw new Error(`Login blocked: ${login.reason}`);
  }

  const cookieHeader = cookieHeaderFromTokens(login.accessToken, login.refreshToken);
  const headers = new Headers({
    cookie: cookieHeader
  });

  const sessionResponse = await getSession(new Request("http://localhost/api/auth/session", { headers }));
  const sessionJson = await sessionResponse.json();

  if (!sessionJson?.ok || sessionJson.state !== "ready") {
    throw new Error(`Session not ready: ${JSON.stringify(sessionJson)}`);
  }

  const loadResult = await loadTenantIntegrations(headers);
  let providerCatalog = loadResult.state === "ready" ? loadResult.providers : [];
  if (loadResult.state === "blocked") {
    throw new Error(`Tenant integrations blocked: ${loadResult.reason}`);
  }

  if (providerCatalog.length === 0) {
    await serviceRestRequest("integration_providers", {
      provider_code: "smoke_provider",
      provider_name: "Smoke Provider",
      provider_category: "ai",
      auth_type: "api_key",
      status: "active",
      capabilities: ["smoke", "secret-capture"],
      public_metadata: {
        smoke: true,
        purpose: "phase074_end_to_end"
      }
    });

    const refreshed = await loadTenantIntegrations(headers);
    if (refreshed.state === "blocked") {
      throw new Error(`Tenant integrations blocked after seeding provider: ${refreshed.reason}`);
    }
    providerCatalog = refreshed.providers;
  }

  const provider =
    providerCatalog.find((item) => item.status === "active" || item.status === "deprecated") ??
    providerCatalog[0];

  if (!provider) {
    throw new Error("No provider catalog items available for smoke");
  }

  const integrationKey = `smoke_phase074_${Date.now()}`;
  const secretMaterial = `smoke-secret-${Date.now()}`;

  const createResponse = await postSecret(
    new Request("http://localhost/api/tenant-integrations/secret", {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider_code: provider.provider_code,
        integration_key: integrationKey,
        integration_name: "Phase 074 Smoke",
        secret_material: secretMaterial
      })
    })
  );

  const createJson = await createResponse.json();
  if (!createJson?.ok || createJson.state !== "ready") {
    throw new Error(`Secret capture blocked: ${JSON.stringify(createJson)}`);
  }

  const receipt = createJson?.data?.receipt ?? {};
  if (!receipt.receipt_ref || receipt.redaction_status !== "NO_SECRET_MATERIAL_RETURNED") {
    throw new Error(`Invalid receipt payload: ${JSON.stringify(receipt)}`);
  }

  const afterLoad = await loadTenantIntegrations(headers);
  if (afterLoad.state === "blocked") {
    throw new Error(`Post-create reload blocked: ${afterLoad.reason}`);
  }

  const createdIntegration = afterLoad.integrations.find((item) => item.integration_key === integrationKey) ?? null;

  const result = {
    login: {
      state: login.state,
      user: login.user
    },
    session: {
      status: sessionResponse.status,
      ok: sessionJson.ok,
      state: sessionJson.state,
      reason: sessionJson.organization_context?.reason ?? sessionJson.reason ?? null
    },
    provider: {
      provider_code: provider.provider_code,
      provider_name: provider.provider_name
    },
    secret_capture: {
      status: createResponse.status,
      ok: createJson.ok,
      state: createJson.state,
      reason: createJson.reason,
      receipt: {
        receipt_ref: receipt.receipt_ref,
        receipt_state: receipt.receipt_state,
        redaction_status: receipt.redaction_status,
        broker_status: receipt.broker_status ?? null
      }
    },
    post_create_integration: createdIntegration
      ? {
          integration_key: createdIntegration.integration_key,
          status: createdIntegration.status,
          connection_state: createdIntegration.connection_state,
          credential_configured: createdIntegration.credential_configured
        }
      : null
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
});
