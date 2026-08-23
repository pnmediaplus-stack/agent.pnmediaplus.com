const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `if (typeof m.content === 'string') {
      m.content = m.content.replace(/data:image\\/[^;]+;base64,[^\\\\)]+/g, 'BỨC_ẢNH_ĐÃ_BỊ_ẨN');
    }`;

const newStr = `if (typeof m.content === 'string') {
      // 1. Strip Base64
      m.content = m.content.replace(/data:image\\/[^;]+;base64,[^\\\\)]+/g, 'BỨC_ẢNH_ĐÃ_BỊ_ẨN');
      
      // 2. Prevent Token Bomb from massive Research Packets or Workflow JSONs
      const jsonBlockRegex = /\\*\\*Research Packet:\\*\\*\\s*\`\`\`json[\\s\\S]*?\`\`\`/g;
      m.content = m.content.replace(jsonBlockRegex, '**Research Packet:** [TRUNCATED_TO_SAVE_TOKENS]');
      
      // 3. General truncation for absurdly long assistant messages (over 3000 chars)
      if (m.role === 'assistant' && m.content.length > 3000) {
        m.content = m.content.substring(0, 3000) + '... [TRUNCATED_TO_SAVE_TOKENS]';
      }
    }`;

if (code.includes(`replace(/data:image\\/[^;]+;base64,[^\\\\)]+/g`)) {
  code = code.replace(`if (typeof m.content === 'string') {
      m.content = m.content.replace(/data:image\\/[^;]+;base64,[^\\\\)]+/g, 'BỨC_ẢNH_ĐÃ_BỊ_ẨN');
    }`, newStr);
} else {
  // Try another replacement string format just in case
  code = code.replace(/if \(typeof m\.content === 'string'\) \{\s*m\.content = m\.content\.replace\(\/data:image[^\n]*\);\s*\}/, newStr);
}

fs.writeFileSync(file, code);
console.log('PATCH_TOKEN_LIMIT_SUCCESS');
