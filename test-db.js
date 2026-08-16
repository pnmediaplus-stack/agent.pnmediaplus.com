const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const orgId = '8289488a-b255-4cb6-9bff-c9d2e71af160';

async function test() {
  const res1 = await fetch(`${url}/rest/v1/tenant_integrations?organization_id=eq.${orgId}&connection_state=eq.healthy`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept-Profile': 'tenant_integration_vault'
    }
  });
  const integrations = await res1.json();
  console.log("Integrations length:", integrations.length);
  if (integrations.length > 0) {
     console.log("First:", integrations[0].integration_key);
  } else {
     console.log("Response:", integrations);
  }
}

test().catch(console.error);
