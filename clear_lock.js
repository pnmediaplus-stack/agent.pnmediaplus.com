const fetch = require('node-fetch');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jrgkpbjsqefvnhbiiutz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contentItemId = 'cd01afb6-3a89-48e5-8cbf-db10036a602c';

async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/phase076_clear_facebook_publish_lock`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_content_item_id: contentItemId })
  });
  
  if (res.ok) {
    console.log("Lock cleared successfully.");
  } else {
    console.log("RPC might not exist, trying direct PATCH/DELETE via API... (Requires exposing schema, likely to fail)");
  }
}
main();
