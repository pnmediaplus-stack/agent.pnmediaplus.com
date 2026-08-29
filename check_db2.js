const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('crm_customers').select('id, full_name, phone_number, updated_at').order('updated_at', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
