const fs = require('fs');
const path = './n8n/workflows/BLUEPRINT_OMNICHANNEL_CSKH.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const node = data.nodes.find(n => n.name === 'Aggregate Tags');
if (node) {
  node.parameters = {
    operation: "aggregateItems",
    fieldsToAggregate: {
      fieldToAggregate: [
        {
          fieldToAggregate: "tag_name",
          renameField: ""
        }
      ]
    },
    options: {}
  };
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
