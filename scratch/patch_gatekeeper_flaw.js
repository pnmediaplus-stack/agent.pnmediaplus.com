const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

// Remove forceToolRouting
code = code.replace(/const forceToolRouting = [^\n]*;\n\n/, '');

// Add routedIntent after data.choices
code = code.replace(
  'const message = data.choices?.[0]?.message;',
  'const message = data.choices?.[0]?.message;\n      const routedIntent = message?.tool_calls?.[0]?.function?.name || null;'
);

// Replace guard
const oldGuard = `if (forceToolRouting) {
          console.warn("[AI_ORCHESTRATOR_GUARD] Model attempted to bypass tool for professional task. Forcing tool routing via fallback.");
          return fallbackRegexMatch(text);
        }`;

const newGuard = `if (routedIntent === "create_content" || routedIntent === "publish_content" || routedIntent === "plan_campaign") {
          return fallbackRegexMatch(text);
        }`;

code = code.replace(oldGuard, newGuard);

fs.writeFileSync(file, code);
console.log('PATCH_GATEKEEPER_LOGIC_FLAW_SUCCESS');
