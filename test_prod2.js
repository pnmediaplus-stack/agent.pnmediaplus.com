const url = 'http://localhost:3001/api/phase2/ai-broker/status';
const body = {
  taskId: '212581fbb1191a195f1a7fda4e3e9799', // from the new screenshot
  provider: 'kie_ai',
  tenant_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
  usage_id: '0dedd025-7ad3-4c4d-acbd-52483e0836ae'
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(async res => {
  if (res.ok) {
    return { status: res.status, data: await res.json() };
  } else {
    return { status: res.status, text: await res.text() };
  }
})
.then(console.log)
.catch(console.error);
