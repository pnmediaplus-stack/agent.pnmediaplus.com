const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const tui = n8n.nodes.find(n => n.name === 'Trigger Chat UI');
if (tui) {
  let body = tui.parameters.jsonBody;
  
  // Replace old mapping with visual_assets mapping
  const oldMd = `\${(webhook.image_urls && webhook.image_urls.length > 0) ? webhook.image_urls.map(url => \`![Image](\${url})\`).join(\"\\\\n\") : (webhook.image_url ? \`![Image](\${webhook.image_url})\` : \"\")}\\\\n\\\\n`;
  const newMd = `\${(webhook.visual_assets && webhook.visual_assets.length > 0) ? webhook.visual_assets.map(url => \`![Image](\${url})\`).join(\"\\\\n\") : \"\"}\\\\n\\\\n`;
  body = body.replace(oldMd, newMd);
  
  // Replace metadata
  body = body.replace(`result_image_url: webhook.image_url`, `visual_assets: webhook.visual_assets`);
  
  tui.parameters.jsonBody = body;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_QA_SUCCESS');
