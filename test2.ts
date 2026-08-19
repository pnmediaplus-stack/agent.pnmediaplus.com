import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: ti } = await supabase.rpc('phase075_get_tenant_vault_credential_ref', {
    p_organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
    p_integration_key: 'system'
  });
  
  // since I don't have the API key locally easily, I will just modify route.ts 
  // to fetch BOTH urls and pick the one that has data!
}
