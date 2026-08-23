const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Fix Get Item (Webhook)
const getItemNode = n8n.nodes.find(n => n.name === 'Get Item (Webhook)');
if (getItemNode) {
  getItemNode.parameters.url = "={{$env[\"SUPABASE_URL\"] || 'http://supabase:8000'}}/rest/v1/phase2_content_items?id=eq.{{$json.content_item_id || $('Webhook Trigger').first().json.body.contentItemId}}&organization_id=eq.{{$json.organization_id || $('Webhook Trigger').first().json.body.organization_id}}";
}

// 2. Fix Upsert Workflow Context (Add execution.id to payload)
const upsertNode = n8n.nodes.find(n => n.name === 'Upsert Workflow Context');
if (upsertNode) {
  upsertNode.parameters.jsonBody = "={\n  \"workflow_run_id\": \"{{$json.workflow_run_id}}\",\n  \"organization_id\": \"{{$json.organization_id}}\",\n  \"thread_id\": \"{{$json.thread_id}}\",\n  \"content_item_id\": \"{{$json.content_item_id}}\",\n  \"workflow_name\": \"PHASE3_AUTO_CONTENT_CREATOR\",\n  \"payload\": { \"n8n_execution_id\": \"{{$execution.id}}\" }\n}";
}

// 3. Fix Load Workflow Context (Query by execution.id instead of crashing expression)
const loadNode = n8n.nodes.find(n => n.name === 'Load Workflow Context');
if (loadNode) {
  loadNode.parameters.url = "={{$env[\"SUPABASE_URL\"] || 'http://supabase:8000'}}/rest/v1/workflow_run_context?payload->>n8n_execution_id=eq.{{$execution.id}}";
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_N8N_CRASH_FIX_SUCCESS');
