const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/app/actions/chat-actions.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const history = (historyRes.data || []).slice(-50); // Increased to 50 messages for broader context',
  'const history = (historyRes.data || []).slice(-5); // Decreased to 5 messages to strictly minimize token cost'
);

fs.writeFileSync(file, code);
console.log('PATCH_HISTORY_LIMIT_SUCCESS');
