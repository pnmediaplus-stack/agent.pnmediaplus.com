require('dotenv').config({ path: '.env.local' });

async function main() {
  const payload = {
    provider: "kie_ai",
    tenant_id: "8289488a-b255-4cb6-9bff-c9d2e71af160",
    taskId: "b522bab7a8dba8efca5c420460e1b994",
    usage_id: "3ed9474e-e5aa-4060-bc47-8fccb3cf9319"
  };

  const res = await fetch('http://localhost:3001/api/phase2/ai-broker/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': 'test-' + Date.now()
    },
    body: JSON.stringify(payload)
  });
  
  const json = await res.json();
  console.log("Status:", JSON.stringify(json, null, 2));
}

main();
