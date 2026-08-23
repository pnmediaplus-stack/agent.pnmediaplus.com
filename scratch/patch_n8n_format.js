const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const formatNode = n8n.nodes.find(n => n.name === 'Format Prompt');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  
  const oldCode = `const imgMatch = (ideaItem.brief || '').match(/!\\[.*?\\]\\(([^)\\s]+)\\)/);
let providedImageUrl = imgMatch ? imgMatch[1] : null;
if (providedImageUrl && providedImageUrl.startsWith('/')) {
   providedImageUrl = 'https://agent.pnmediaplus.com' + providedImageUrl;
}`;

  const newCode = `const imgRegex = /!\\[.*?\\]\\(([^)\\s]+)\\)/g;
const matches = [...(ideaItem.brief || '').matchAll(imgRegex)];
let providedImageUrls = matches.map(m => m[1]);
if (providedImageUrls.length > 0) {
  providedImageUrls = providedImageUrls.map(url => url.startsWith('/') ? 'https://agent.pnmediaplus.com' + url : url);
}
let providedImageUrl = providedImageUrls.length > 0 ? providedImageUrls[0] : null;`;

  jsCode = jsCode.replace(oldCode, newCode);
  
  // also replace the return statement again
  const oldReturn = `return { json: { prompt: prompt, item: ideaItem, providedImageUrl, tenant_id: ideaItem.organization_id, organization_id: ideaItem.organization_id } };`;
  const newReturn = `return { json: { prompt: prompt, item: ideaItem, providedImageUrl, providedImageUrls, tenant_id: ideaItem.organization_id, organization_id: ideaItem.organization_id } };`;
  
  jsCode = jsCode.replace(oldReturn, newReturn);
  formatNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_N8N_FORMAT_SUCCESS');
