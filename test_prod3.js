const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

fetch('https://agent.pnmediaplus.com/api/phase2/ai-broker/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: '3f0e3e2f69012063bb9ae06d32101e3e',
    provider: 'kie_ai',
    tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
    usage_id: 'd7e3ec85-15ae-4ce0-b3fe-bfb09893fb04'
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
