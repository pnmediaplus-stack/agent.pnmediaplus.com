const fs = require('fs');
const wf = fs.readFileSync('n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json', 'utf8');
const matches = wf.match(/\$env\["([^"]+)"\]/g);
console.log(Array.from(new Set(matches)));
