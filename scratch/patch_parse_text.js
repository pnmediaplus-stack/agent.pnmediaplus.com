const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const parseNode = n8n.nodes.find(n => n.name === 'Parse Text');
if (parseNode) {
  let jsCode = parseNode.parameters.jsCode;
  
  jsCode = jsCode.replace(
    "const captionPacket = typeof parsed.agent_2_publish_ready_caption === 'string' ? parsed.agent_2_publish_ready_caption.trim() : '';",
    `let captionPacket = typeof parsed.agent_2_publish_ready_caption === 'string' ? parsed.agent_2_publish_ready_caption.trim() : '';
// Tự động chuyển đổi xuống dòng đơn thành xuống dòng kép để tránh dính chữ trên Facebook
captionPacket = captionPacket.replace(/(?<!\\n)\\n(?!\\n)/g, '\\n\\n');`
  );
  
  parseNode.parameters.jsCode = jsCode;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_PARSE_TEXT_SUCCESS');
