const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const validateNode = n8n.nodes.find(n => n.name === 'Validate FB Publish');
if (validateNode) {
  validateNode.parameters.jsCode = `const fbResponse = $json;

if (fbResponse.error) {
  throw new Error('Facebook API Error: ' + fbResponse.error.message);
}

let externalId = '';

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
  
  // Extract canonical ID from the last operation in the batch
  const lastOp = fbResponse[fbResponse.length - 1];
  const lastBody = typeof lastOp.body === 'string' ? JSON.parse(lastOp.body) : lastOp.body;
  
  // Graph API /photos returns { id: "photo_id", post_id: "page_id_post_id" }
  // Graph API /feed returns { id: "page_id_post_id" }
  externalId = lastBody?.post_id || lastBody?.id || '';
} else if (fbResponse.id) {
  externalId = fbResponse.post_id || fbResponse.id;
} else {
  throw new Error('Unexpected Facebook API response: ' + JSON.stringify(fbResponse));
}

return { 
  json: { 
    id: externalId, 
    status: 'ok', 
    fbResponse 
  } 
};`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_VALIDATE_NODE_SUCCESS');
