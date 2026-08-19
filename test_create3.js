require('dotenv').config({ path: '.env.local' });

const url = 'http://localhost:3001/api/phase2/ai-broker';
const body = {
  prompt: 'A cute banana',
  aspectRatio: '1:1',
  outputFormat: 'jpeg',
  enableTranslation: true
};

fetch('https://api.kie.ai/api/v1/nano-banana-2-lite/generate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json', 
    'x-request-id': 'test-' + Date.now(),
    'Authorization': 'Bearer ' + process.env.CONTROL_PLANE_SECRET
  },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
