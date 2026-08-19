require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // need node-fetch if Node < 18, but Node 22 has fetch

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: ti } = await supabase.rpc('phase075_get_tenant_vault_credential_ref', {
    p_organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
    p_integration_key: 'system'
  });
  
  const tokenReq = await supabase.rpc('phase075_issue_reference_token', {
    p_credential_ref: ti.credential_ref,
    p_scope: 'llm:invoke',
    p_actor_type: 'SYSTEM',
    p_actor_ref: 'test'
  });
  
  const secretData = await supabase.rpc('phase075_redeem_reference_token', {
    p_lease_token: tokenReq.data.lease_token,
    p_organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
    p_integration_key: 'system',
    p_actor_type: 'SYSTEM',
    p_actor_ref: 'test'
  });

  const apiKey = secretData.data.access_token.split('\n')[0].trim();
  console.log("Got API Key:", apiKey.substring(0, 5) + '...');
  
  console.log("Creating task...");
  const res = await fetch('https://api.kie.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "nano-banana-2-lite",
      prompt: "A cute banana",
      aspectRatio: "1:1",
      outputFormat: "jpeg"
    })
  });
  
  const json = await res.json();
  console.log("Creation Response:", JSON.stringify(json, null, 2));
  
  if (json.data && json.data.taskId) {
      console.log("Polling /jobs/recordInfo...");
      const pollRes = await fetch(`https://api.kie.ai/v1/jobs/recordInfo?taskId=${json.data.taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      console.log("Poll Response:", JSON.stringify(await pollRes.json(), null, 2));
  }
}

main();
