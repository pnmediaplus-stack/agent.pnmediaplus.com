const fs = require('fs');
const path = './n8n/workflows/BLUEPRINT_OMNICHANNEL_CSKH.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

['tool_update_tags', 'tool_handoff_to_human'].forEach(name => {
  const node = data.nodes.find(n => n.name === name);
  if (node) {
    node.parameters.authentication = 'genericCredentialType';
    node.parameters.genericAuthType = 'httpHeaderAuth';
    node.credentials = {
      httpHeaderAuth: {
        name: 'ControlPlaneAuth'
      }
    };
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
