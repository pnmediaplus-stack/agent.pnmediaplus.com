import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactVersionId = process.env.ARTIFACT_VERSION_ID;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!artifactVersionId) {
  console.error("❌ Missing ARTIFACT_VERSION_ID. Gatekeeper requirement: Muốn test thật phải map SSOT ID thật qua biến môi trường.");
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function seedData() {
  console.log("🌱 Đang chuẩn bị Fixture (Data) cho luồng N8N Publish...");

  // 1. Lấy 1 organization hợp lệ
  const orgRes = await fetch(`${supabaseUrl}/rest/v1/portal_organizations?limit=1`, { headers });
  const orgs = await orgRes.json();
  if (!orgs || orgs.length === 0) {
    console.error("❌ Không tìm thấy tenant/organization hợp lệ!");
    return;
  }
  const organizationId = orgs[0].organization_id;
  
  // 2. Lấy 1 integration hợp lệ (để pass mock RPC validation)
  const intRes = await fetch(`${supabaseUrl}/rest/v1/tenant_integrations?organization_id=eq.${organizationId}&limit=1`, { headers });
  const ints = await intRes.json();
  if (!ints || ints.length === 0) {
    console.error("❌ Tenant này không có integration nào! Hãy cấu hình Fanpage cho Tenant trước.");
    return;
  }
  const targetIntegrationKey = ints[0].integration_key;

  // 3. Tạo Content Item & Assets Fixture qua RPC bảo mật
  const rpcBody = {
    p_organization_id: organizationId,
    p_integration_key: targetIntegrationKey,
    p_content_key: 'n8n_test_publish_' + Date.now(),
    p_owner_ref: 'test_user',
    p_title: 'Post Facebook Tự Động bằng N8N',
    p_brief: 'Test luồng end-to-end',
    p_artifact_version_id: artifactVersionId
  };

  const contentRes = await fetch(`${supabaseUrl}/rest/v1/rpc/phase076_prepare_test_fixture`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rpcBody)
  });

  if (!contentRes.ok) {
    console.error("❌ Lỗi tạo Content Item:", await contentRes.text());
    return;
  }
  
  const itemId = (await contentRes.text()).replace(/"/g, '');
  console.log(`✅ [1] Đã tạo Fixture Content Item ID: ${itemId}`);
  console.log(`✅ [1b] Đã map Artifact Version ID (SSOT): ${artifactVersionId}`);
  console.log(`✅ [2] Organization ID: ${organizationId}`);
  console.log(`✅ [3] Target Integration: ${targetIntegrationKey}`);
  console.log("✅ [4] Fixture đã chèn đầy đủ image & caption, trạng thái hiện tại: 'idea'");
  console.log("⚠️ Lưu ý: Fixture chưa đạt trạng thái 'scheduled' nên N8N sẽ từ chối Publish (Gatekeeper Rule). Bạn cần mô phỏng duyệt bài trên UI hoặc gọi RPC Approval.");

  // 4. Dry-Run Dispatcher
  const webhookUrl = 'http://localhost:5678/webhook/fb-publish-executor';
  const dispatchPayload = {
    organization_id: organizationId,
    artifact_version_id: artifactVersionId,
    content_item_id: itemId,
    integration_key: targetIntegrationKey,
    lease_token: '<REAL_LEASE_TOKEN_REQUIRED>',
    broker_receipt_ref: '<REAL_BROKER_RECEIPT_REQUIRED>'
  };

  console.log(`\n🚀 [DRY-RUN] Test script complete. N8N Webhook NOT automatically fired.`);
  console.log(`\n💡 Lệnh cURL tham khảo (Hãy thay thế token thật):`);
  console.log(`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '${JSON.stringify(dispatchPayload, null, 2)}'`);

  console.log("\n🎉 HOÀN TẤT CHUẨN BỊ FIXTURE!");
}

seedData();
