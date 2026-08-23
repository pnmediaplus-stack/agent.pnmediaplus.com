const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json', 'utf8'));
const envs = new Set();
JSON.stringify(wf, (k, v) => {
  if (typeof v === 'string') {
    const m = v.match(/\$env\["([^"]+)"\]/g);
    if (m) m.forEach(x => envs.add(x));
  }
  return v;
});
console.log(Array.from(envs));
