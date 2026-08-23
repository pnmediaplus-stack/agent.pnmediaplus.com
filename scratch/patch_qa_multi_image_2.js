const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const triggerQA = n8n.nodes.find(n => n.name === 'Trigger QA Gatekeeper');
if (triggerQA) {
  let body = triggerQA.parameters.jsonBody;
  
  const oldLine = `  image_urls: $('Format Prompt').first().json.providedImageUrls || $('Map R2 URL').all().map(i => i.json?.r2_url).filter(Boolean) || [],`;
  const newLine = `  image_urls: ($('Format Prompt').first().json.providedImageUrls && $('Format Prompt').first().json.providedImageUrls.length > 0) ? $('Format Prompt').first().json.providedImageUrls : ($('Map R2 URL').all().map(i => i.json?.r2_url).filter(Boolean) || []),`;
  
  if (body.includes(oldLine)) {
    body = body.replace(oldLine, newLine);
    triggerQA.parameters.jsonBody = body;
  }
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_QA_MULTI_IMAGE_2_SUCCESS');
