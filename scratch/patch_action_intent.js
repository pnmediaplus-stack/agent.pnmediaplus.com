const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Update Format Prompt
const fp = n8n.nodes.find(n => n.name === 'Format Prompt');
if (fp) {
  let code = fp.parameters.jsCode;
  
  // Add action_intent rule
  const ruleToInject = `- IF the user provided reference images, read their brief carefully. If they want to post those exact images, you will output "use_provided_images". If they explicitly ask to redraw, analyze, or generate a NEW image based on them, output "generate_new_image". If no images were provided, output "generate_new_image".\n\nCRITICAL OUTPUT FORMAT:`;
  code = code.replace('CRITICAL OUTPUT FORMAT:', ruleToInject);
  
  // Update JSON example
  const oldJson = `{
  "agent_1_research_packet": "Nội dung phân tích và góc khai thác social...",
  "agent_2_publish_ready_caption": "Hook hấp dẫn...\\\\n\\\\nNội dung...\\\\n\\\\nCall to action...",
  "agent_3_image_prompt": "A detailed production-quality image-generation prompt in English..."
}`;
  const newJson = `{
  "agent_1_research_packet": "Nội dung phân tích và góc khai thác social...",
  "agent_2_publish_ready_caption": "Hook hấp dẫn...\\\\n\\\\nNội dung...\\\\n\\\\nCall to action...",
  "agent_3_image_prompt": "A detailed production-quality image-generation prompt in English...",
  "action_intent": "use_provided_images"
}`;
  code = code.replace(oldJson, newJson);
  
  // Also fix "exactly these three top-level keys" to four
  code = code.replace('Return exactly these three top-level keys', 'Return exactly these four top-level keys');
  
  fp.parameters.jsCode = code;
}

// 2. Update Parse Text
const pt = n8n.nodes.find(n => n.name === 'Parse Text');
if (pt) {
  let code = pt.parameters.jsCode;
  // Parse action_intent and output it
  const appendCode = `
try {
  item.action_intent = parsed.action_intent || 'generate_new_image';
} catch(e) {
  item.action_intent = 'generate_new_image';
}
return { json: item };`;
  code = code.replace('return { json: item };', appendCode);
  pt.parameters.jsCode = code;
}

// 3. Update Has Image in Brief?
const hi = n8n.nodes.find(n => n.name === 'Has Image in Brief?');
if (hi) {
  // We change the condition to check BOTH providedImageUrl notEmpty AND action_intent == 'use_provided_images'
  hi.parameters.conditions.conditions = [
    {
      "id": "c1",
      "leftValue": "={{ $('Format Prompt').first().json.providedImageUrl }}",
      "rightValue": "",
      "operator": {
        "type": "string",
        "operation": "notEmpty"
      }
    },
    {
      "id": "c2",
      "leftValue": "={{ $json.action_intent }}",
      "rightValue": "use_provided_images",
      "operator": {
        "type": "string",
        "operation": "equals"
      }
    }
  ];
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_WORKFLOW_SUCCESS');
