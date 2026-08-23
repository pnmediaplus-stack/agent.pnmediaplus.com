const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const setNode = n8n.nodes.find(n => n.name === 'Set Workflow Run ID');
if (setNode) {
  let jsCode = setNode.parameters.jsCode;
  jsCode = jsCode.replace("try { $execution.customData.set('workflow_run_id', workflow_run_id); } catch(e) {}", "");
  setNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_FINAL_GATEKEEPER_V4_SUCCESS');
