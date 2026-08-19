const url = 'http://localhost:3001/api/phase2/ai-broker';
const body = {
  model: 'nano-banana-2-lite',
  provider: 'kie_ai',
  tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
  prompt: 'A cute banana',
  size: '1024x1024',
  async: true,
  // Force endpointUrl here so it skips the DB!
  endpointUrl: 'https://api.kie.ai/v1/images/generations'
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-request-id': 'test-' + Date.now() },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
