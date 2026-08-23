const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

// Filter out the dead nodes
n8n.nodes = n8n.nodes.filter(n => n.name !== 'Format Output' && n.name !== 'Push to Chat DB');

// Also ensure they are removed from connections just in case
delete n8n.connections['Format Output'];
delete n8n.connections['Push to Chat DB'];

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_REMOVE_DEAD_NODES_SUCCESS');
