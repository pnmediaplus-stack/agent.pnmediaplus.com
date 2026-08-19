require('dotenv').config({ path: '.env.local' });
const { invokeLlm } = require('./src/lib/llm-client');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const responseData = await invokeLlm({
      model: 'nano-banana-2-lite',
      provider: 'kie_ai',
      tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
      prompt: 'A cute banana',
      size: '1024x1024',
      async: true
    }, {
      actorId: 'test',
      tenantId: '8289488a-b255-4cb6-9bff-c9d2e71af160',
      requestId: 'test',
      async: true
    });
    
    console.log("Success:", JSON.stringify(responseData, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
