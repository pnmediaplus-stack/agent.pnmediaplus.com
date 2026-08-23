const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Format Prompt
const fp = n8n.nodes.find(n => n.name === 'Format Prompt');
if (fp) {
  let code = fp.parameters.jsCode;
  
  // Replace the image extraction logic
  const oldExtract = `const imgRegex = /!\\[.*?\\]\\(([^)\\s]+)\\)/g;\nconst matches = [...(ideaItem.brief || '').matchAll(imgRegex)];\nlet providedImageUrls = matches.map(m => m[1]);\nif (providedImageUrls.length > 0) {\n  providedImageUrls = providedImageUrls.map(url => url.startsWith('/') ? 'https://agent.pnmediaplus.com' + url : url);\n}\nlet providedImageUrl = providedImageUrls.length > 0 ? providedImageUrls[0] : null;`;
  
  const newExtract = `let providedImageUrls = [];
if (ideaItem.artifacts && ideaItem.artifacts.visual_assets) {
  providedImageUrls = ideaItem.artifacts.visual_assets;
} else {
  const imgRegex = /!\\[.*?\\]\\(([^)\\s]+)\\)/g;
  const matches = [...(ideaItem.brief || '').matchAll(imgRegex)];
  providedImageUrls = matches.map(m => m[1]);
}
if (providedImageUrls.length > 0) {
  providedImageUrls = providedImageUrls.map(url => url.startsWith('/') ? 'https://agent.pnmediaplus.com' + url : url);
}`;
  code = code.replace(oldExtract, newExtract);
  
  // Replace return
  code = code.replace(`providedImageUrl, providedImageUrls`, `visual_assets: providedImageUrls`);
  fp.parameters.jsCode = code;
}

// 2. Has Image in Brief?
const hi = n8n.nodes.find(n => n.name === 'Has Image in Brief?');
if (hi) {
  hi.parameters.conditions.conditions[0].leftValue = `={{ $('Format Prompt').first().json.visual_assets && $('Format Prompt').first().json.visual_assets.length > 0 }}`;
  hi.parameters.conditions.conditions[0].operator.operation = `true`;
}

// 3. Set Provided Image
const spi = n8n.nodes.find(n => n.name === 'Set Provided Image');
if (spi) {
  spi.parameters.jsCode = `const item = $json;\nitem.r2_urls = $('Format Prompt').first().json.visual_assets || [];\nif (!item.artifacts) item.artifacts = {};\nitem.artifacts.visual_assets = item.r2_urls;\nreturn { json: item };`;
}

// 4. Submit Visual
const sv = n8n.nodes.find(n => n.name === 'Submit Visual');
if (sv) {
  let body = sv.parameters.jsonBody;
  body = body.replace(/\$json.artifacts.images/g, `$json.artifacts.visual_assets`);
  body = body.replace(`content: $json.artifacts.image`, `content: $json.artifacts.visual_assets[0]`);
  sv.parameters.jsonBody = body;
}

// 5. Trigger QA Gatekeeper
const tq = n8n.nodes.find(n => n.name === 'Trigger QA Gatekeeper');
if (tq) {
  let body = tq.parameters.jsonBody;
  // Remove image_url and image_urls
  body = body.replace(/  image_url:.*\\n/g, '');
  body = body.replace(/  image_urls:.*\\n/g, '');
  // Insert visual_assets
  const injectTarget = `caption: $('Parse Text').first().json.textContent.agent_2_publish_ready_caption || $('Extract Caption').first().json.artifacts?.caption || '',\\n`;
  const injectCode = `  visual_assets: ($('Format Prompt').first().json.visual_assets && $('Format Prompt').first().json.visual_assets.length > 0) ? $('Format Prompt').first().json.visual_assets : ($('Map R2 URL').all().map(i => i.json?.r2_url).filter(Boolean) || []),\\n`;
  if (!body.includes('visual_assets:')) {
    body = body.replace(injectTarget, injectTarget + injectCode);
    tq.parameters.jsonBody = body;
  }
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PHASE3_SUCCESS');
