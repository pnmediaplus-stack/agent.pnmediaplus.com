const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `VISUAL AESTHETIC:`;
const newStr = `PHYSICAL LOGIC & ANATOMY:
- ALWAYS specify correct physical logic and perspective for technology (laptops, phones, monitors).
- Explicitly instruct: "Laptops and phones must be held or positioned correctly. The screen must face the user, NOT the camera or the back of the device. Keyboards must face up."
- Prevent anatomical AI errors (e.g., six fingers, floating limbs) by requesting realistic poses and lighting.

VISUAL AESTHETIC:`;

code = code.replace(targetStr, newStr);

fs.writeFileSync(file, code);
console.log('PATCH_IMAGE_PROMPT_SUCCESS');
