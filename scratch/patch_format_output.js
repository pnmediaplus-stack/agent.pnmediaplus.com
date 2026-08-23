const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
const n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const formatNode = n8n.nodes.find(n => n.name === 'Format Output');
if (formatNode) {
  let jsCode = formatNode.parameters.jsCode;
  
  // Add strict check and remove fallback
  jsCode = jsCode.replace(
    "p_idempotency_key: outboxId || ('fallback_' + $execution.id),",
    "p_idempotency_key: outboxId,"
  );
  
  if (!jsCode.includes("MISSING_OUTBOX_ID")) {
    jsCode = jsCode.replace("return {", "if (!outboxId) throw new Error('MISSING_OUTBOX_ID_FOR_FORMAT_OUTPUT');\n\nreturn {");
  }
  
  formatNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_FORMAT_OUTPUT_SUCCESS');
