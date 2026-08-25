const fs = require('fs');
const path = './n8n/workflows/BLUEPRINT_OMNICHANNEL_CSKH.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const node = data.nodes.find(n => n.name === 'Postgres Chat Memory');
if (node) {
  node.parameters.sessionKey = "={{ \Webhook Trigger (From Next.js).first().json.body.thread_id }}";
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
