const fs = require('fs');

const path = 'n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Modify Extract FB Assets node
const extractNode = data.nodes.find(n => n.name === 'Extract FB Assets');
if (extractNode) {
  extractNode.parameters.jsCode = `const payload = $('Fetch Assets').item.json;
const accessToken = $('Redeem BYOK Token').item.json.data.access_token;
const pageId = $('Redeem BYOK Token').item.json.data.page_id;
const contentItemId = $('Webhook Trigger').item.json.body.content_item_id;
const organizationId = $('Webhook Trigger').item.json.body.organization_id;
const threadId = $('Webhook Trigger').item.json.body.thread_id;

return {
  caption: payload.caption || '',
  image: payload.image || '',
  accessToken: accessToken,
  pageId: pageId,
  contentItemId: contentItemId,
  organizationId: organizationId,
  threadId: threadId
};`;
}

// Modify Callback Success node
const callbackNode = data.nodes.find(n => n.name === 'Callback Success');
if (callbackNode && callbackNode.parameters.bodyParameters && callbackNode.parameters.bodyParameters.parameters) {
  const params = callbackNode.parameters.bodyParameters.parameters;
  if (!params.find(p => p.name === 'threadId')) {
    params.push({
      name: 'threadId',
      value: "={{ $('Extract FB Assets').item.json.threadId }}"
    });
  }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Successfully patched fb publish workflow');
