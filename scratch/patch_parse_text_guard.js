const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 2. Update Parse Text
const pt = n8n.nodes.find(n => n.name === 'Parse Text');
if (pt) {
  pt.parameters.jsCode = `const responseText = $input.first().json.choices?.[0]?.message?.content || '{}';
const item = $('Format Prompt').item.json.item;
const tenant_id = $('Format Prompt').item.json.tenant_id;
let parsed = {};
try {
  parsed = JSON.parse(responseText);
} catch(e) {
  throw new Error('AI Response was not valid JSON');
}

const researchPacket = typeof parsed.agent_1_research_packet === 'string' ? parsed.agent_1_research_packet.trim() : '';
let captionPacket = typeof parsed.agent_2_publish_ready_caption === 'string' ? parsed.agent_2_publish_ready_caption.trim() : '';
// Tự động chuyển đổi xuống dòng đơn thành xuống dòng kép để tránh dính chữ trên Facebook
captionPacket = captionPacket.replace(/(?<!\\n)\\n(?!\\n)/g, '\\n\\n');
const imagePrompt = typeof parsed.agent_3_image_prompt === 'string' ? parsed.agent_3_image_prompt.trim() : '';
if (!researchPacket) {
  throw new Error('RESEARCH_PACKET_MISSING');
}
if (!captionPacket) {
  throw new Error('CAPTION_PACKET_MISSING');
}
if (!imagePrompt) {
  throw new Error('IMAGE_PROMPT_MISSING');
}

// Normalization Guard for action_intent
let rawIntent = String(parsed.action_intent || '').toLowerCase().trim();
let actionIntent = 'generate_new_image'; // Deterministic fallback
if (rawIntent.includes('use_provided')) {
  actionIntent = 'use_provided_images';
}

return { 
  json: { 
    id: item.id, 
    organization_id: item.organization_id,
    tenant_id: tenant_id,
    textContent: {
      agent_1_research_packet: researchPacket,
      agent_2_publish_ready_caption: captionPacket,
      agent_3_image_prompt: imagePrompt
    },
    action_intent: actionIntent,
    item: item
  } 
};`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PARSE_TEXT_SUCCESS');
