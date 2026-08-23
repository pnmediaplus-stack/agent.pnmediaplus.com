const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1 & 2: Fix Push Error to Chat
const pushErrNode = n8n.nodes.find(n => n.name === 'Push Error to Chat');
if (pushErrNode) {
  pushErrNode.credentials = {
    "httpHeaderAuth": {
      "id": "nlRh1UkRewsK7CCR",
      "name": "ControlPlaneAuth"
    }
  };
  pushErrNode.parameters.sendHeaders = true;
  pushErrNode.parameters.headerParameters = {
    "parameters": [
      {
        "name": "x-request-id",
        "value": "={{$execution.id}}-error"
      }
    ]
  };
}

// 3: Fix Limit Polling
const limitNode = n8n.nodes.find(n => n.name === 'Limit Polling');
if (limitNode) {
  limitNode.parameters.jsCode = `
if ($runIndex > 120) {
  let threadId = 'unknown';
  try { threadId = $('Webhook Trigger').first().json.body.threadId || $('Webhook Trigger').first().json.threadId; } catch(e) {}
  throw new Error('POLL_TIMEOUT|' + threadId + '|Image generation took too long');
}
return $input.all();
`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_TIMEOUT_AND_ERROR_CHAT_SUCCESS');
