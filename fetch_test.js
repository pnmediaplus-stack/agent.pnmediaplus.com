const url = 'https://agent.pnmediaplus.com/api/phase2/ai-broker/status';
const body = {
  taskId: 'd38ced523557ed99c5893f0922c0997a',
  provider: 'kie_ai',
  tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
  usage_id: '569f6ebd-41a1-4c7d-bad1-13a16fb6a00c'
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(console.log)
.catch(console.error);
