const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const triggerNode = n8n.nodes.find(n => n.name === 'Trigger QA Gatekeeper');
if (triggerNode) {
  const jsonBody = triggerNode.parameters.jsonBody;
  if (!jsonBody.includes('qa_retry_count:')) {
    // Inject it into the JSON stringified object
    const injection = ",\n  qa_retry_count: $('Webhook Trigger').first().json.body?.qa_retry_count || $('Webhook Trigger').first().json?.qa_retry_count || 0";
    triggerNode.parameters.jsonBody = jsonBody.replace('outboxId: $(\'Poll Image Status\').all()[0]?.json?.outbox_id || \'\'', 'outboxId: $(\'Poll Image Status\').all()[0]?.json?.outbox_id || \'\'' + injection);
  }
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_RETRY_COUNT_SUCCESS');
