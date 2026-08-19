import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc(
    'phase075_get_tenant_vault_credential_ref',
    {
      p_organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160', // from screenshot
      p_integration_key: 'system' // wait, I don't know the integration key. Let's just query the raw secret if we can.
    }
  );
  
  // Actually, I can just query `tenant_integration_vault.tenant_integrations` for the organization_id.
  const { data: ti, error: tiErr } = await supabase.rpc('phase077_get_all_active_tenant_integrations', { p_organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160' });
  console.log("Tenant Integrations:", ti);
}
main();
