const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const extract = n8n.nodes.find(n => n.name === 'Extract FB Assets');
if (extract) {
  let body = extract.parameters.jsCode;
  
  // Replace images reading
  body = body.replace(`const images = payload.images || [payload.image].filter(Boolean);`, `const images = payload.visual_assets || [];`);
  body = body.replace(`images: images,`, `visual_assets: images,`);
  
  extract.parameters.jsCode = body;
}

const validate = n8n.nodes.find(n => n.name === 'Validate FB Publish');
if (validate) {
  let body = validate.parameters.jsCode;
  
  // Actually validate just checks if externalId exists, doesn't care about images vs visual_assets, but let's see.
  // We can just leave validate as is, because it gets inputs from Publish to Facebook.
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PHASE4_SUCCESS');
