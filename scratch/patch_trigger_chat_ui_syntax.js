const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_QA_GATEKEEPER.json';
let n8n = JSON.parse(fs.readFileSync(file, 'utf8'));

const node = n8n.nodes.find(n => n.name === 'Trigger Chat UI');
if (node) {
  // Fix the invalid syntax by removing the escaping backslash before the single quotes
  // We use double quotes for the string literal to avoid escaping hell
  node.parameters.jsonBody = `={{ (() => {
  const webhook = $("Webhook").first().json.body;
  const qa = $("Parse Result").first().json.result;
  
  const bodyStr = \`✅ **Trưởng phòng AI QA đã duyệt bài xuất sắc (\${qa.average_score}/10).**\\n\\n_Đánh giá:_ \${qa.reason}\\n\\n**ID Bài Viết:** \\\`\${webhook.content_item_id}\\\`\\n\\n![Generated Image](\${webhook.image_url})\\n\\n**Caption:**\\n\${webhook.caption.replace(/\\n/g, "\\n\\n")}\\n\\n**Research Packet:**\\n\\\`\\\`\\\`json\\n\${JSON.stringify(webhook.research, null, 2)}\\n\\\`\\\`\\\`\`;
  
  return JSON.stringify({
    p_thread_id: webhook.thread_id,
    p_idempotency_key: webhook.outboxId || ("qa_pass_" + $execution.id),
    p_sender: "agent",
    p_content: bodyStr,
    p_intent_type: "publish_prompt",
    p_metadata: {
      contentItemId: webhook.content_item_id,
      task_id: webhook.taskId,
      provider_code: webhook.providerCode,
      model_code: webhook.modelCode,
      usage_id: webhook.usageId,
      outbox_id: webhook.outboxId,
      result_image_url: webhook.image_url
    }
  });
})() }}`;
}

fs.writeFileSync(file, JSON.stringify(n8n, null, 2));
console.log('PATCH_TRIGGER_CHAT_UI_SYNTAX_SUCCESS');
