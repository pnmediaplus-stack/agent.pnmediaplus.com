const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = n8n.nodes.find(n => n.name === 'Mark as Scheduled');
if (node) {
  node.parameters.jsonBody = `={{ (() => {
  // Gatekeeper Guard: Only allow execution if previous node succeeded OR failed specifically due to Regression
  const statusCode = $json.statusCode || $json.error?.status || $json.error?.statusCode || 200;
  // Supabase trigger throws 400 for Regression. Allow 400, throw otherwise.
  if (statusCode >= 400 && statusCode !== 400 && statusCode !== 409) {
    throw new Error('UPDATE_ITEM_STATE_NOT_ACCEPTED: HTTP_' + statusCode);
  }
  return JSON.stringify({ state: "scheduled" });
})() }}`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_STATUS_CODE_GUARD_SUCCESS');
