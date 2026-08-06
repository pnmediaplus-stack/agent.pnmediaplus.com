import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function seedData() {
  console.log("🌱 Đang chuẩn bị nguyên liệu (Data) cho bộ máy N8N qua Dispatcher Pattern...");

  // 1. Lấy 1 organization hợp lệ
  const orgRes = await fetch(`${supabaseUrl}/rest/v1/portal_organizations?limit=1`, { headers });
  const orgs = await orgRes.json();
  if (!orgs || orgs.length === 0) {
    console.error("❌ Không tìm thấy tenant/organization hợp lệ!");
    return;
  }
  const organizationId = orgs[0].organization_id;
  const targetIntegrationKey = 'facebook_page_721220557289262';

  // 2. Tạo Content Item qua RPC bảo mật (không đụng trực tiếp View)
  const rpcBody = {
    p_organization_id: organizationId,
    p_integration_key: targetIntegrationKey,
    p_content_key: 'n8n_test_publish_' + Date.now(),
    p_owner_ref: 'test_user',
    p_title: 'Post Facebook Tự Động bằng N8N & BYOK Vault',
    p_brief: 'Test luồng end-to-end từ Scheduled -> Publish'
  };

  const contentRes = await fetch(`${supabaseUrl}/rest/v1/rpc/phase076_mock_scheduled_content`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rpcBody)
  });

  if (!contentRes.ok) {
    console.error("❌ Lỗi tạo Content Item:", await contentRes.text());
    return;
  }
  
  const itemId = (await contentRes.text()).replace(/"/g, '');
  console.log(`✅ [1] Đã tạo Content Item ID (Scoped): ${itemId}`);
  console.log(`✅ [2] Organization ID: ${organizationId}`);
  console.log(`✅ [3] Target Integration: ${targetIntegrationKey}`);
  console.log("✅ [4] Giả lập luồng duyệt content (QA -> Passed -> Scheduled)");

  // 3. Dispatch tới N8N
  const webhookUrl = 'http://localhost:5678/webhook/fb-publish-executor';
  const dispatchPayload = {
    organization_id: organizationId,
    artifact_version_id: itemId, // Mapping the content_item_id as artifact_version_id per the new schema
    content_item_id: itemId,
    integration_key: targetIntegrationKey,
    lease_token: 'mock_lease_token_123',
    broker_receipt_ref: 'mock_broker_receipt_456'
  };

  console.log(`\n🚀 Đang bắn Dispatcher (Webhook) tới N8N tại ${webhookUrl}...`);
  try {
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispatchPayload)
    });
    console.log(`✅ Kết quả Webhook: ${webhookRes.status} ${webhookRes.statusText}`);
    console.log(`✅ Phản hồi:`, await webhookRes.text());
  } catch (err) {
    console.error(`❌ Không thể gọi N8N Webhook! Lỗi: ${err.message}`);
    console.log(`\n💡 Gợi ý: Hãy chắc chắn bạn đang bật luồng N8N (hoặc bấm "Execute Workflow" chờ Webhook)`);
    console.log(`Hoặc tự giả lập lệnh cURL sau:\n`);
    console.log(`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '${JSON.stringify(dispatchPayload)}'`);
  }

  console.log("\n🎉 HOÀN TẤT DISPATCHER FLOW!");
}

seedData();
