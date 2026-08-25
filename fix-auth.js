const fs = require('fs');
const path = './n8n/workflows/BLUEPRINT_OMNICHANNEL_CSKH.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

['Dispatch Reply via Universal API', 'tool_update_tags', 'tool_handoff_to_human'].forEach(name => {
  const node = data.nodes.find(n => n.name === name);
  if (node && node.credentials && node.credentials.httpHeaderAuth) {
    node.credentials.httpHeaderAuth.name = 'ControlPlaneAuth';
    // Remove the hardcoded ID so n8n binds it by name instead
    delete node.credentials.httpHeaderAuth.id;
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
