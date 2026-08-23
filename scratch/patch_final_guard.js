const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the bad root guard
code = code.replace(/if \(isProfessionalRequest && message\?\.content\) \{\s*return fallbackRegexMatch\(text\);\s*\}/, '');

// 2. Inject into else if (message?.content)
const elseIfStr = `} else if (message?.content) {`;
const newElseIf = `} else if (message?.content) {
        if (isProfessionalRequest && (!message?.tool_calls || message?.tool_calls?.length === 0)) {
          console.warn("[AI_ORCHESTRATOR_GUARD] Fallback routing activated for text-only professional request.");
          return fallbackRegexMatch(text);
        }`;
code = code.replace(elseIfStr, newElseIf);

fs.writeFileSync(file, code);
console.log('PATCH_FINAL_GUARD_SUCCESS');
