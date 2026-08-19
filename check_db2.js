require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

fetch(`${supabaseUrl}/rest/v1/integration_providers?provider_code=eq.kie_ai&select=public_metadata`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Accept-Profile': 'tenant_integration_vault'
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)));
