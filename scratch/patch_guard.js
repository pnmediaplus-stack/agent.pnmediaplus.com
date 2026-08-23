const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

// Insert forceToolRouting variable declaration
const declarationsStr = 'let messages: any[] = [';
const forceToolDecl = `const forceToolRouting = /viết bài|tạo nội dung|lên bài|đăng bài|publish|campaign|tạo ảnh|viết.*mẫu|viết.*content/i.test(text);\n\n  let messages: any[] = [`;
code = code.replace(declarationsStr, forceToolDecl);

// Insert the guard inside the message?.content block
const oldElseIf = `} else if (message?.content) {
        // The AI decided to ask a clarifying question or answer based on read tools
        return {
          intentType: "unknown",
          agentReply: message.content
        };
      }`;

const newElseIf = `} else if (message?.content) {
        // HARD ARCHITECTURAL GUARD:
        // If the user request demands professional execution (content/image/campaign),
        // we strictly forbid the AI from answering directly via text.
        if (forceToolRouting) {
          console.warn("[AI_ORCHESTRATOR_GUARD] Model attempted to bypass tool for professional task. Forcing tool routing via fallback.");
          return fallbackRegexMatch(text);
        }

        // The AI decided to ask a clarifying question or answer based on read tools
        return {
          intentType: "unknown",
          agentReply: message.content
        };
      }`;

code = code.replace(oldElseIf, newElseIf);

fs.writeFileSync(file, code);
console.log('PATCH_GUARD_SUCCESS');
