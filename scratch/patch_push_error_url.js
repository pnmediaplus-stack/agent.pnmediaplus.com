const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = n8n.nodes.find(n => n.name === 'Push Error to Chat');
if (node) {
  node.parameters.url = node.parameters.url.replace('SUPABASE_URL', 'API_BASE_URL').replace('http://supabase:8000', 'https://agent.pnmediaplus.com');
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PUSH_ERROR_URL_SUCCESS');
