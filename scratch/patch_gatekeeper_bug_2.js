const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the dead code inside else if (message?.content)
const deadCodeRegex = /if \(routedIntent === "create_content"[\s\S]*?fallbackRegexMatch\(text\);\n\s*\}/;
code = code.replace(deadCodeRegex, '');

// 2. Insert Gatekeeper's new guard right after const message = ...
const insertPoint = 'const message = data.choices?.[0]?.message;\n      const routedIntent = message?.tool_calls?.[0]?.function?.name || null;';

const newGuard = `const requestIntent = fallbackRegexMatch(text).intentType;
      const isProfessionalRequest =
        requestIntent === "create_content" ||
        requestIntent === "publish_content" ||
        requestIntent === "plan_campaign";

      if (isProfessionalRequest && message?.content) {
        return fallbackRegexMatch(text);
      }`;

code = code.replace(insertPoint, `${insertPoint}\n\n      ${newGuard}`);

fs.writeFileSync(file, code);
console.log('PATCH_GATEKEEPER_BUG_2_SUCCESS');
