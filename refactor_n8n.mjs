import fs from 'fs';

const workflowPath = 'n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
const data = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// 1. Remove Schedule Trigger and Fetch Scheduled Items
data.nodes = data.nodes.filter(n => n.name !== 'Schedule Trigger' && n.name !== 'Fetch Scheduled Items');

// 2. Add Webhook Trigger
data.nodes.push({
  "parameters": {
    "httpMethod": "POST",
    "path": "fb-publish-executor",
    "options": {}
  },
  "name": "Webhook Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1.1,
  "position": [ 100, 300 ]
});

// 3. Update Fetch Facebook Integration
const fetchFbNode = data.nodes.find(n => n.name === 'Fetch Facebook Integration');
if (fetchFbNode) {
  fetchFbNode.parameters.url = '=https://jrgkpbjsqefvnhbiiutz.supabase.co/rest/v1/rpc/phase076_find_tenant_integration';
  fetchFbNode.parameters.sendBody = true;
  fetchFbNode.parameters.bodyParameters = {
    "parameters": [
      {
        "name": "p_organization_id",
        "value": "={{ $json.body.organization_id }}"
      },
      {
        "name": "p_integration_key",
        "value": "={{ $json.body.integration_key }}"
      }
    ]
  };
  fetchFbNode.position = [ 300, 300 ];
}

// 4. Update Fetch Assets (from Phase 2)
const fetchAssetsNode = data.nodes.find(n => n.name === 'Fetch Assets');
if (fetchAssetsNode) {
  fetchAssetsNode.parameters.url = fetchAssetsNode.parameters.url.replace(
    /\$\('Fetch Scheduled Items'\)\.item\.json\.id/g,
    "$('Webhook Trigger').item.json.body.artifact_version_id"
  );
}

// 5. Update Extract FB Assets
const extractAssetsNode = data.nodes.find(n => n.name === 'Extract FB Assets');
if (extractAssetsNode && extractAssetsNode.parameters.jsCode) {
  extractAssetsNode.parameters.jsCode = extractAssetsNode.parameters.jsCode.replace(
    /\$\('Fetch Scheduled Items'\)\.item\.json\.id/g,
    "$('Webhook Trigger').item.json.body.artifact_version_id"
  );
}

// Update connections
data.connections['Webhook Trigger'] = {
  "main": [
    [
      {
        "node": "Fetch Facebook Integration",
        "type": "main",
        "index": 0
      }
    ]
  ]
};
delete data.connections['Schedule Trigger'];
delete data.connections['Fetch Scheduled Items'];

fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2));
console.log('Updated workflow JSON successfully.');
