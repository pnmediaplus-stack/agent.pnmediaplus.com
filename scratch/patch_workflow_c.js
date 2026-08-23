const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Extract FB Assets
const extractNode = n8n.nodes.find(n => n.name === 'Extract FB Assets');
if (extractNode) {
  extractNode.parameters.jsCode = `const payload = $('Fetch Assets').item.json;
const accessToken = $('Redeem BYOK Token').item.json.data.access_token;
const pageId = $('Redeem BYOK Token').item.json.data.page_id;
const contentItemId = $('Webhook Trigger').item.json.body.content_item_id;
const organizationId = $('Webhook Trigger').item.json.body.organization_id;
const threadId = $('Webhook Trigger').item.json.body.thread_id;

const images = payload.images || [payload.image].filter(Boolean);
let batch = [];

if (images.length === 1) {
  const url = images[0].startsWith('http') ? images[0] : (($env["API_BASE_URL"] || 'https://agent.pnmediaplus.com') + images[0]);
  batch.push({
    method: "POST",
    relative_url: \`\${pageId}/photos\`,
    body: \`url=\${encodeURIComponent(url)}&message=\${encodeURIComponent(payload.caption)}&published=true\`
  });
} else if (images.length > 1) {
  let attachedMedia = [];
  images.forEach((img, i) => {
    const url = img.startsWith('http') ? img : (($env["API_BASE_URL"] || 'https://agent.pnmediaplus.com') + img);
    batch.push({
      method: "POST",
      relative_url: \`\${pageId}/photos\`,
      name: \`photo\${i}\`,
      omit_response_on_success: false,
      body: \`url=\${encodeURIComponent(url)}&published=false\`
    });
    attachedMedia.push({ "media_fbid": \`{result=photo\${i}:$.id}\` });
  });
  
  batch.push({
    method: "POST",
    relative_url: \`\${pageId}/feed\`,
    body: \`message=\${encodeURIComponent(payload.caption)}&attached_media=\${encodeURIComponent(JSON.stringify(attachedMedia))}\`
  });
}

return {
  caption: payload.caption || '',
  images: images,
  batch_payload: JSON.stringify(batch),
  accessToken: accessToken,
  pageId: pageId,
  contentItemId: contentItemId,
  organizationId: organizationId,
  threadId: threadId
};`;
}

// 2. Publish to Facebook (HTTP Request)
const publishNode = n8n.nodes.find(n => n.name === 'Publish to Facebook');
if (publishNode) {
  publishNode.parameters.url = `={{ 'https://graph.facebook.com/v19.0' }}`;
  publishNode.parameters.bodyParameters = {
    parameters: [
      {
        name: "access_token",
        value: "={{ $('Extract FB Assets').item.json.accessToken }}"
      },
      {
        name: "batch",
        value: "={{ $('Extract FB Assets').item.json.batch_payload }}"
      }
    ]
  };
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_WORKFLOW_C_SUCCESS');
