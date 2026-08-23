const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = n8n.nodes.find(n => n.name === 'Mark as Scheduled');
if (node) {
  // 1. Fix the ID reference to be absolute so it survives if previous node outputs an error object
  node.parameters.url = '={{$env["SUPABASE_URL"] || "http://supabase:8000"}}/rest/v1/phase2_content_items?id=eq.{{ $(\'IF Verdict Pass\').item.json.content_item_id }}';
  
  // 2. Add Gatekeeper's exact guard policy into the jsonBody evaluation
  node.parameters.jsonBody = `={{ (() => {
  // Gatekeeper Guard: Only allow execution if previous node succeeded OR failed specifically due to Regression
  const msg = $json.message || '';
  if (msg && !msg.includes('CONTENT_STATE_REGRESSION_FORBIDDEN')) {
    throw new Error('UPDATE_ITEM_STATE_NOT_ACCEPTED: ' + msg);
  }
  return JSON.stringify({ state: "scheduled" });
})() }}`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_MARK_SCHEDULED_GUARD_SUCCESS');
