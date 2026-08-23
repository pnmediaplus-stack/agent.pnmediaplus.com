const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const loadNode = n8n.nodes.find(n => n.name === 'Load Workflow Context');
if (loadNode) {
  loadNode.parameters.url = "={{$env[\"SUPABASE_URL\"] || 'http://supabase:8000'}}/rest/v1/workflow_run_context?workflow_run_id=eq.{{$json.workflow_run_id}}&select=workflow_run_id,organization_id,thread_id,content_item_id,status,last_error,payload";
}

const formatNode = n8n.nodes.find(n => n.name === 'Format Error');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  
  // Remove the crashing webhookBody reference
  const webhookBodyRegex = /const webhookBody = \$\('Webhook Trigger'\)[\s\S]*?if \(!organizationId\) \{[\s\S]*?\}/;
  jsCode = jsCode.replace(webhookBodyRegex, '');
  
  formatNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_FINAL_URL_SUCCESS');
