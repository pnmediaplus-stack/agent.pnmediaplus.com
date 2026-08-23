const fs = require('fs');

// 1. Update schema.ts
const schemaFile = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/tools/schema.ts';
let schemaCode = fs.readFileSync(schemaFile, 'utf8');
schemaCode = schemaCode.replace(
  'description: "Trigger the creation of marketing content or viral research for a campaign or topic.",',
  'description: "Trigger the creation of marketing content or viral research for a campaign or topic. MUST be called whenever the user asks to write (viết), draft, create a post, or asks for a sample article (bài mẫu).",'
);
fs.writeFileSync(schemaFile, schemaCode);

// 2. Update router.ts fallback regex
const routerFile = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let routerCode = fs.readFileSync(routerFile, 'utf8');
routerCode = routerCode.replace(
  /function fallbackRegexMatch[\s\S]*?return \{ intentType: "unknown" \};\n\}/,
  `function fallbackRegexMatch(text: string): IntentResult {
  const lowerBody = text.toLowerCase();
  
  // create_content trumps publish_content if both are mentioned ("viết bài để đăng")
  if (/viết.*bài|tạo.*nội dung|lên.*bài|viết.*mẫu|viết.*content/i.test(lowerBody)) {
    return { intentType: 'create_content' };
  } else if (lowerBody.includes('đăng nội dung') || lowerBody.includes('đăng bài') || lowerBody.includes('publish') || lowerBody.includes('đăng lên')) {
    return { intentType: 'publish_content' };
  } else if (lowerBody.includes('chiến dịch') || lowerBody.includes('campaign')) {
    return { intentType: 'plan_campaign' };
  }
  
  return { intentType: "unknown" };
}`
);
fs.writeFileSync(routerFile, routerCode);
console.log('PATCH_ROUTER_SUCCESS');
