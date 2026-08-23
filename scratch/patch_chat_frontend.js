const fs = require('fs');
let code = fs.readFileSync('src/components/chat/HumanCommandChat.tsx', 'utf8');

code = code.replace(
  `async function handleSubmit(text: string) {`,
  `async function handleSubmit(text: string, visual_assets: string[] = []) {`
);

code = code.replace(
  `const result = await sendChatMessage(thread.id, trimmed);`,
  `const result = await sendChatMessage(thread.id, trimmed, visual_assets);`
);

fs.writeFileSync('src/components/chat/HumanCommandChat.tsx', code);
console.log('PATCH_FRONTEND_SUCCESS');
