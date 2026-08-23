const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

n8n.nodes = n8n.nodes.map(n => {
  if (n.name === 'Update Item State' || n.name === 'Mark as Scheduled') {
    n.onError = 'continueErrorOutput';
    // Ensure the node ignores HTTP status codes so it doesn't throw a hard node error before the continueOnFail logic
    if (!n.parameters.options) n.parameters.options = {};
    n.parameters.options.ignoreResponseCode = true;
  }
  return n;
});

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_QA_IGNORE_REGRESSION_SUCCESS');
