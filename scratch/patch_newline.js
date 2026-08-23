const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const formatNode = n8n.nodes.find(n => n.name === 'Format Prompt');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  
  // Replace the old constraint
  jsCode = jsCode.replace(
    '- Represent intended paragraph breaks using the standard JSON escape sequence (\\\\n).',
    '- Represent intended paragraph breaks using DOUBLE newlines with the standard JSON escape sequence (\\\\n\\\\n).'
  );
  
  // Make sure the example also has \\n\\n (it already did, but let's check)
  // Actually, I can also add a post-processing step in Parse Text just in case the AI only outputs \n!
  formatNode.parameters.jsCode = jsCode;
}

// In Parse Text, we can safely convert single \n to \n\n if there are no \n\n already.
// Wait, if we convert \n to \n\n, what if it's a bulleted list?
// Bullet lists shouldn't have double spacing between items usually, but on FB it's fine.
// Actually, fixing the prompt is the best way.

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PROMPT_NEWLINE_SUCCESS');
