const fs = require('fs');

// Patch 1: PHASE3_AUTO_CONTENT_CREATOR
const file1 = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
const triggerQA = n8n1.nodes.find(n => n.name === 'Trigger QA Gatekeeper');
if (triggerQA) {
  let body = triggerQA.parameters.jsonBody;
  
  // Add image_urls to the payload
  const lineToInsertAfter = `  image_url: $('Format Prompt').first().json.providedImageUrl || $('Map R2 URL').all()[0]?.json?.r2_url || '',`;
  const newLine = `\n  image_urls: $('Format Prompt').first().json.providedImageUrls || $('Map R2 URL').all().map(i => i.json?.r2_url).filter(Boolean) || [],`;
  
  if (!body.includes('image_urls:')) {
    body = body.replace(lineToInsertAfter, lineToInsertAfter + newLine);
    triggerQA.parameters.jsonBody = body;
  }
}
fs.writeFileSync(file1, JSON.stringify(n8n1, null, 2));


// Patch 2: PHASE3_QA_GATEKEEPER
const file2 = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n2 = JSON.parse(fs.readFileSync(file2, 'utf8'));
const triggerUI = n8n2.nodes.find(n => n.name === 'Trigger Chat UI');
if (triggerUI) {
  let code = triggerUI.parameters.jsonBody;
  
  // Replace the single image markdown with a multi-image markdown generator
  // `![Generated Image](${webhook.image_url})\\n\\n`
  const oldMd = '![Generated Image](${webhook.image_url})\\\\n\\\\n';
  const newMd = '${(webhook.image_urls && webhook.image_urls.length > 0) ? webhook.image_urls.map(url => `![Image](${url})`).join(\"\\\\n\") : (webhook.image_url ? `![Image](${webhook.image_url})` : \"\")}\\\\n\\\\n';
  
  if (code.includes('![Generated Image]')) {
    code = code.replace('![Generated Image](${webhook.image_url})\\n\\n', newMd);
  }
  
  triggerUI.parameters.jsonBody = code;
}
fs.writeFileSync(file2, JSON.stringify(n8n2, null, 2));

console.log('PATCH_QA_MULTI_IMAGE_SUCCESS');
