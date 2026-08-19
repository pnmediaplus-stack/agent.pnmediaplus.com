import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .schema('tenant_integration_vault')
    .from('integration_providers')
    .select('provider_code, provider_name');
  console.log("Error:", error);
  console.log("Data:", data);
}
main();
