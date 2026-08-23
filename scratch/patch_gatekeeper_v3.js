const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const setNode = n8n.nodes.find(n => n.name === 'Set Workflow Run ID');
if (setNode) {
  let jsCode = setNode.parameters.jsCode;
  jsCode = jsCode.replace(
    "return { json: { ...$input.first().json, workflow_run_id, organization_id, thread_id, content_item_id } };",
    "return { json: { ...$input.first().json, workflow_run_id: workflow_run_id, organization_id, thread_id, content_item_id } };"
  );
  setNode.parameters.jsCode = jsCode;
}

const formatNode = n8n.nodes.find(n => n.name === 'Format Error');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  jsCode = jsCode.replace(
    "if (dbContext.workflow_run_id) workflowRunId = dbContext.workflow_run_id;",
    "if ($json.workflow_run_id) workflowRunId = $json.workflow_run_id;"
  );
  formatNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_FINAL_GATEKEEPER_V3_SUCCESS');
