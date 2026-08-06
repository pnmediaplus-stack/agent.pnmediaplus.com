import fs from 'fs';
import path from 'path';

// Load env
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envLocal.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=');
    env[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'];
const SUPABASE_SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const BROKER_INTERNAL_SECRET = env['BROKER_INTERNAL_SECRET'];
const NEXT_PUBLIC_BASE_URL = env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000';

async function supabaseFetch(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Accept-Profile": "tenant_integration_vault",
      "Content-Profile": "tenant_integration_vault"
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, options);
  if (!res.ok) throw new Error(`Supabase Error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function run() {
  try {
    console.log("1. Finding Facebook Fanpage Integration...");
    const integrations = await supabaseFetch('/rest/v1/tenant_integrations?integration_key=like.facebook_page_*&select=organization_id,integration_key,vault_credential_ref&limit=1');

    if (!integrations || integrations.length === 0) {
      console.error("No facebook_page integration found in Vault!");
      return;
    }

    const integration = integrations[0];
    console.log(`Found Integration: ${integration.integration_key}`);
    console.log(`Credential Ref: ${integration.vault_credential_ref}`);

    console.log("\n2. Issuing BYOK Reference Token (Simulating Next.js Auth Flow)...");
    const tokenData = await supabaseFetch('/rpc/byok_issue_reference_token', 'POST', {
      p_credential_ref: integration.vault_credential_ref,
      p_scope: 'llm:publish',
      p_requested_by_actor_type: 'HUMAN',
      p_requested_by_actor_ref: 'admin_test_script',
      p_request_id: crypto.randomUUID(),
      p_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    const referenceToken = tokenData[0]?.lease_token;
    if (!referenceToken) throw new Error("Failed to get lease_token from RPC");

    console.log(`Successfully issued reference_token (expires in 15m)`);

    console.log("\n3. Redeeming Token via Broker API (Simulating N8N Webhook)...");
    const redeemPayload = {
      reference_token: referenceToken,
      organization_id: integration.organization_id,
      integration_key: integration.integration_key
    };

    const response = await fetch(`${NEXT_PUBLIC_BASE_URL}/api/byok/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-broker-internal-secret": BROKER_INTERNAL_SECRET
      },
      body: JSON.stringify(redeemPayload)
    });

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`);
    const bodyText = await response.text();
    console.log(`Response Body: ${bodyText}`);

    if (response.ok) {
      const json = JSON.parse(bodyText);
      const data = json.data;
      if (data && data.access_token) {
         console.log("\n✅ SUCCESS: Broker successfully decrypted the Vault Secret and returned the real access_token to N8N!");
         console.log(`Page ID: ${data.page_id}`);
         console.log(`Access Token: [REDACTED - Length: ${data.access_token.length}]`);
      } else {
         console.error("\n❌ FAILED: Response OK but missing access_token");
      }
    } else {
      console.error("\n❌ FAILED: Redeem request was rejected by Broker");
    }
  } catch (err) {
    console.error("Test Script Error:", err);
  }
}

run();
