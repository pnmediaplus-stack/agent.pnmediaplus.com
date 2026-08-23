const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/app/actions/chat-actions.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const history = (historyRes.data || []).slice(-5); // Decreased to 5 messages to strictly minimize token cost',
  'const history = (historyRes.data || []).slice(-10); // Decreased to 10 messages for a balanced token/context ratio'
);

fs.writeFileSync(file, code);
console.log('PATCH_HISTORY_10_SUCCESS');
