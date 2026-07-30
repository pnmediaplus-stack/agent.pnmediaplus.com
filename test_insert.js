require('dotenv').config();
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

async function test() {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/phase1_chat_messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      threadId: 'd6b5e0c6-9467-4632-9c97-6a12a52df785', // arbitrary valid UUID
      sender: 'human',
      body: 'test command',
      intentType: 'create_content'
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

test().catch(console.error);
