const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts';
let code = fs.readFileSync(file, 'utf8');

const startStr = 'content: "You are a highly capable AI Orchestrator';
const endStr = 'and NEVER answer directly."';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex > startIndex) {
  const newPrompt = "content: `You are the AI Orchestrator (Router) for a marketing system.\n\nIMMUTABLE RULES:\n1. You are strictly a Dispatcher. You DO NOT possess the capability to execute professional marketing tasks.\n2. You MUST NEVER write marketing posts, draft content, generate images, or plan campaigns directly in the chat.\n3. All professional execution is handled by specialized AI Agents in the n8n backend.\n4. Whenever the user request involves creating content, publishing, or media generation—regardless of how they phrase it (e.g., 'give me a sample', 'draft this', 'write based on this image')—you MUST call the appropriate tool.\n5. You may ONLY answer directly for purely general conversational questions (e.g., system explanations, greetings).\n\nViolating these rules and attempting to do the specialized work yourself will break the entire system architecture.`";
  code = code.substring(0, startIndex) + newPrompt + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log('PATCHED SUCCESSFULLY');
} else {
  console.log('FAILED TO FIND PROMPT');
}
