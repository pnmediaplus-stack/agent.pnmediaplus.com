const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Remove legacy action_intent prompt instruction from Format Prompt
const fp = n8n.nodes.find(n => n.name === 'Format Prompt');
if (fp) {
  let code = fp.parameters.jsCode;
  
  // Remove the action_intent injection we did earlier
  const ruleToRemove = `- IF the user provided reference images, read their brief carefully. If they want to post those exact images, you will output "use_provided_images". If they explicitly ask to redraw, analyze, or generate a NEW image based on them, output "generate_new_image". If no images were provided, output "generate_new_image".\\n\\n`;
  code = code.replace(ruleToRemove, '');
  
  // Update JSON example back to 3 keys
  const oldJson = `{
  "agent_1_research_packet": "Nội dung phân tích và góc khai thác social...",
  "agent_2_publish_ready_caption": "Hook hấp dẫn...\\\\n\\\\nNội dung...\\\\n\\\\nCall to action...",
  "agent_3_image_prompt": "A detailed production-quality image-generation prompt in English...",
  "action_intent": "use_provided_images"
}`;
  const newJson = `{
  "agent_1_research_packet": "Nội dung phân tích và góc khai thác social...",
  "agent_2_publish_ready_caption": "Hook hấp dẫn...\\\\n\\\\nNội dung...\\\\n\\\\nCall to action...",
  "agent_3_image_prompt": "A detailed production-quality image-generation prompt in English..."
}`;
  code = code.replace(oldJson, newJson);
  
  // Revert keys count
  code = code.replace('Return exactly these four top-level keys', 'Return exactly these three top-level keys');
  
  fp.parameters.jsCode = code;
}

// 2. Remove legacy fallback from Parse Text
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
captionPacket = captionPacket.replace(/(?<!\\n)\\n(?!\\n)/g, '\\n\\n');
const imagePrompt = typeof parsed.agent_3_image_prompt === 'string' ? parsed.agent_3_image_prompt.trim() : '';
if (!researchPacket) throw new Error('RESEARCH_PACKET_MISSING');
if (!captionPacket) throw new Error('CAPTION_PACKET_MISSING');
if (!imagePrompt) throw new Error('IMAGE_PROMPT_MISSING');

// DETERMINISTIC GUARD: Strictly extract flag from Orchestrator
const briefText = item.brief || '';
let actionIntent = 'generate_new_image'; // Deterministic strict default
if (briefText.includes('--image-action=use_provided')) {
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
console.log('PATCH_FINAL_CLEANUP_SUCCESS');
