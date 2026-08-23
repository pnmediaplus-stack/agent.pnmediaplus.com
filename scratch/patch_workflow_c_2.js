const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// Fix Format Error
const formatErrorNode = n8n.nodes.find(n => n.name === 'Format Error');
if (formatErrorNode) {
  formatErrorNode.parameters.jsCode = `let threadId = '';
let contentItemId = 'unknown';
let organizationId = $env['ORGANIZATION_ID'] || '';
let errorMessage = $json.execution?.error?.message || 'Unknown Error';

try {
  const webhook = $('Webhook Trigger').first();
  if (webhook && webhook.json && webhook.json.body) {
    const b = webhook.json.body;
    if (b.threadId) threadId = b.threadId;
    if (b.content_item_id) contentItemId = b.content_item_id;
    if (b.organization_id) organizationId = b.organization_id;
  }
} catch (e) {}

return {
  json: {
    threadId: threadId || 'fallback-thread',
    contentItemId: contentItemId || 'unknown',
    organizationId: organizationId || 'unknown',
    errorMessage
  }
};`;
}

// Fix Extract FB Assets and Validate Facebook batch publish
const extractNode = n8n.nodes.find(n => n.name === 'Extract FB Assets');
if (extractNode) {
  // It's already mostly good from the previous patch, just let's check it.
}

const publishNode = n8n.nodes.find(n => n.name === 'Publish to Facebook');
if (publishNode) {
  // We need to add validation after publish node.
}

// We will add a validation node after Publish to Facebook, before Callback Success
// If there's an error in any batch request, we should THROW so it goes to Error Trigger
const validateNode = {
  "parameters": {
    "jsCode": `const fbResponse = $json;

if (fbResponse.error) {
  throw new Error('Facebook API Error: ' + fbResponse.error.message);
}

// Facebook batch API returns an array of responses
if (Array.isArray(fbResponse)) {
  for (let i = 0; i < fbResponse.length; i++) {
    const res = fbResponse[i];
    if (res.code !== 200) {
      const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
      const errorMsg = body?.error?.message || 'Unknown batch error';
      throw new Error(\`Facebook Batch Error at step \${i}: \${errorMsg}\`);
    }
  }
} else if (fbResponse.id) {
  // Single image publish success, do nothing
} else {
  throw new Error('Unexpected Facebook API response: ' + JSON.stringify(fbResponse));
}

return { json: { status: 'ok', fbResponse } };`
  },
  "id": "validate-fb-publish-node",
  "name": "Validate FB Publish",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [
    publishNode.position[0] + 200,
    publishNode.position[1]
  ]
};

// Shift Callback Success to the right
const callbackSuccessNode = n8n.nodes.find(n => n.name === 'Callback Success');
if (callbackSuccessNode) {
  callbackSuccessNode.position[0] += 200;
}

// Add the node if it doesn't exist
if (!n8n.nodes.find(n => n.name === 'Validate FB Publish')) {
  n8n.nodes.push(validateNode);
  
  // Reroute connections: Publish -> Validate -> Callback Success
  const publishConnections = n8n.connections['Publish to Facebook'].main[0];
  n8n.connections['Publish to Facebook'].main[0] = [
    {
      "node": "Validate FB Publish",
      "type": "main",
      "index": 0
    }
  ];
  
  n8n.connections['Validate FB Publish'] = {
    main: [
      publishConnections // should point to Callback Success
    ]
  };
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_WORKFLOW_C_2_SUCCESS');
