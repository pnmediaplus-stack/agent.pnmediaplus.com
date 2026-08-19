const url = 'http://localhost:3001/api/phase2/ai-broker/status';
const body = {
  provider: 'kie_ai',
  tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
  taskId: 'dd94754c647ac7e853e5c59a9e1fa71c'
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
