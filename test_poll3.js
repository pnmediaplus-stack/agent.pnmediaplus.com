require('dotenv').config({ path: '.env.local' });

async function main() {
  const payload = {
    provider: "kie_ai",
    tenant_id: "8289488a-b255-4cb6-9bff-c9d2e71af160",
    taskId: "5769b87edcb79ebc60da4f3ea8d78c08",
    usage_id: "a893ba55-a8ef-45f5-ad1d-b2889db596b5"
  };

  while (true) {
    const res = await fetch('http://localhost:3001/api/phase2/ai-broker/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'test-' + Date.now(),
        'Authorization': 'Bearer ' + process.env.CONTROL_PLANE_SECRET
      },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    console.log("Status:", JSON.stringify(json, null, 2));
    
    if (json.status !== 'processing') break;
    await new Promise(r => setTimeout(r, 5000));
  }
}

main();
