const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = n8n.nodes.find(n => n.name === 'Check Retry Count');
if (node && node.parameters.conditions && node.parameters.conditions.number) {
  node.parameters.conditions.number[0].operation = 'smaller';
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_RETRY_OPERATION_SUCCESS');
