const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Simulate the AI Broker request
fetch('https://agent.pnmediaplus.com/api/phase2/ai-broker', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nano-banana-2-lite',
    provider: 'kie_ai',
    tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
    prompt: 'A cute banana',
    size: '1024x1024',
    async: true
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
