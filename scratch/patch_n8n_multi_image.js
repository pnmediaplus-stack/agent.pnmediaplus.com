const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Format Prompt
const formatNode = n8n.nodes.find(n => n.name === 'Format Prompt');
if (formatNode) {
  formatNode.parameters.jsCode = formatNode.parameters.jsCode.replace(
    /const imgMatch = \(ideaItem\.brief \|\| ''\)\.match\(\/\\!\\\[\.\*\?\\\]\\\(\(\[\^\\\)\]\+\)\\\)\/\);\nlet providedImageUrl = imgMatch \? imgMatch\[1\] : null;\nif \(providedImageUrl && providedImageUrl\.startsWith\('\/'\)\) \{\n   providedImageUrl = 'https:\/\/agent\.pnmediaplus\.com' \+ providedImageUrl;\n\}/g,
    `const imgRegex = /!\\[.*?\\]\\(([^)\\s]+)\\)/g;
const matches = [...(ideaItem.brief || '').matchAll(imgRegex)];
let providedImageUrls = matches.map(m => m[1]);
if (providedImageUrls.length > 0) {
  providedImageUrls = providedImageUrls.map(url => url.startsWith('/') ? 'https://agent.pnmediaplus.com' + url : url);
}
let providedImageUrl = providedImageUrls.length > 0 ? providedImageUrls[0] : null;`
  );
  // Add providedImageUrls to returned json
  formatNode.parameters.jsCode = formatNode.parameters.jsCode.replace(
    /return \{ json: \{ prompt: prompt, item: ideaItem, providedImageUrl, tenant_id: ideaItem\.organization_id, organization_id: ideaItem\.organization_id \} \};/g,
    `return { json: { prompt: prompt, item: ideaItem, providedImageUrl, providedImageUrls, tenant_id: ideaItem.organization_id, organization_id: ideaItem.organization_id } };`
  );
}

// 2. Set Provided Image
const setNode = n8n.nodes.find(n => n.name === 'Set Provided Image');
if (setNode) {
  setNode.parameters.jsCode = `const item = $json;
item.r2_urls = $('Format Prompt').first().json.providedImageUrls || [];
if (item.r2_urls.length === 0 && $('Format Prompt').first().json.providedImageUrl) {
   item.r2_urls = [$('Format Prompt').first().json.providedImageUrl];
}
item.r2_url = item.r2_urls[0];
if (!item.artifacts) item.artifacts = {};
item.artifacts.image = item.r2_url;
item.artifacts.images = item.r2_urls;
return { json: item };`;
}

// 3. Submit Visual
const submitNode = n8n.nodes.find(n => n.name === 'Submit Visual');
if (submitNode) {
  // modify the p_stage_payload to include an array of artifacts if item.artifacts.images exists
  // wait, the jsonBody is evaluated as an expression.
  const oldBody = submitNode.parameters.jsonBody;
  submitNode.parameters.jsonBody = `={{ {
  p_organization_id: $json.organization_id,
  p_content_item_id: $json.id,
  p_expected_current_state: 'research_ready',
  p_next_state: 'visual_ready',
  p_actor_ref: 'agent_content_creator',
  p_idempotency_key: \`trans_\${$execution.id}_visual\`,
  p_stage_payload: {
    artifacts: ($json.artifacts.images && $json.artifacts.images.length > 0)
      ? $json.artifacts.images.map((url, i) => ({
          artifact_key: \`vis_\${$execution.id}_\${i}_\${$json.id.replace(/-/g, '_')}\`,
          artifact_type: 'visual_asset',
          content: url,
        }))
      : [
          {
            artifact_key: \`vis_\${$execution.id}_\${$json.id.replace(/-/g, '_')}\`,
            artifact_type: 'visual_asset',
            content: $json.artifacts.image,
          }
        ]
  },
} }}`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_N8N_MULTI_IMAGE_SUCCESS');
