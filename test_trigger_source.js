require('dotenv').config({ path: '.env.local' });
const { SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
const url = NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql?query=' + encodeURIComponent("select prosrc from pg_proc where proname='phase1_chat_messages_insert';");
fetch(url, {
  method: 'GET',
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
  }
}).then(r => r.json()).then(console.log).catch(console.error);
