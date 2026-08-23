const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Fix Load Workflow Context URL
const loadNode = n8n.nodes.find(n => n.name === 'Load Workflow Context');
if (loadNode) {
  loadNode.parameters.url = "={{$env[\"SUPABASE_URL\"] || 'http://supabase:8000'}}/rest/v1/workflow_run_context?workflow_run_id=eq.{{$json.workflow_run_id || $('Webhook Trigger').first().json.body.workflow_run_id}}&select=workflow_run_id,organization_id,thread_id,content_item_id,status,last_error,payload";
}

// 2. Fix Upsert Workflow Context JSON Body
const upsertNode = n8n.nodes.find(n => n.name === 'Upsert Workflow Context');
if (upsertNode) {
  upsertNode.parameters.jsonBody = "={\n  \"workflow_run_id\": \"{{$json.workflow_run_id}}\",\n  \"organization_id\": \"{{$json.organization_id}}\",\n  \"thread_id\": \"{{$json.thread_id}}\",\n  \"content_item_id\": \"{{$json.content_item_id}}\",\n  \"workflow_name\": \"PHASE3_AUTO_CONTENT_CREATOR\",\n  \"payload\": { \"source\": \"PHASE3_AUTO_CONTENT_CREATOR\" }\n}";
}

// 3. Fix Format Error JS Code
const formatNode = n8n.nodes.find(n => n.name === 'Format Error');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  
  // Remove the fallback block
  const fallbackRegex = /if \(!workflowRunId\) \{[\s\S]*?errorMsg = '\[ERROR_PATH_CONTEXT_MISSING\] ' \+ errorMsg;\s*\}/;
  jsCode = jsCode.replace(fallbackRegex, '');
  
  formatNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_FINAL_CLEANUP_SUCCESS');
