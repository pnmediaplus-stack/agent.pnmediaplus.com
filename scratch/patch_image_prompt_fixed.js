const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const formatPromptNode = n8n.nodes.find(n => n.name === 'Format Prompt');
if (formatPromptNode) {
  const oldStr = 'VISUAL AESTHETIC:';
  const newStr = 'PHYSICAL LOGIC & ANATOMY:\\n- ALWAYS specify correct physical logic and perspective for technology (laptops, phones, monitors).\\n- Explicitly instruct: "Laptops and phones must be held or positioned correctly. The screen must face the user, NOT the camera or the back of the device. Keyboards must face up."\\n- Prevent anatomical AI errors (e.g., six fingers, floating limbs) by requesting realistic poses and lighting.\\n\\nVISUAL AESTHETIC:';
  
  formatPromptNode.parameters.jsCode = formatPromptNode.parameters.jsCode.replace(oldStr, newStr);
  fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
  console.log('PATCH_IMAGE_PROMPT_FIXED_SUCCESS');
}
