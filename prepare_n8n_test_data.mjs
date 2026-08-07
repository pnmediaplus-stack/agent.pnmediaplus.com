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
const organizationId = process.env.ORGANIZATION_ID;
const targetIntegrationKey = process.env.FACEBOOK_INTEGRATION_KEY;
const imageUrl = process.env.E2E_IMAGE_URL ||
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!artifactVersionId) {
  console.error("❌ Missing ARTIFACT_VERSION_ID. Gatekeeper requirement: Muốn test thật phải map SSOT ID thật qua biến môi trường.");
  process.exit(1);
}

if (!organizationId || !targetIntegrationKey) {
  console.error("❌ Missing ORGANIZATION_ID or FACEBOOK_INTEGRATION_KEY. Fixture must use explicit tenant scope.");
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

  // Tạo Content Item & Assets Fixture qua RPC bảo mật, với tenant scope tường minh.
  const rpcBody = {
    p_organization_id: organizationId,
    p_integration_key: targetIntegrationKey,
    p_content_key: 'n8n_test_publish_' + Date.now(),
    p_owner_ref: 'test_user',
    p_title: 'Post Facebook Tự Động bằng N8N',
    p_brief: 'Test luồng end-to-end',
    p_artifact_version_id: artifactVersionId,
    p_image_url: imageUrl
  };

  const contentRes = await fetch(`${supabaseUrl}/rest/v1/rpc/phase076_prepare_test_fixture_with_image`, {
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
  console.log(`✅ [4] Fixture đã chèn research, image (${imageUrl}), caption và QA pass; trạng thái hiện tại: 'scheduled'`);
  console.log("⚠️ Đây là fixture tổng hợp cho E2E có kiểm soát; script không tự gọi webhook N8N và không tự đăng Facebook.");

  // Dry-Run Dispatcher
  const webhookBaseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  const webhookUrl = webhookBaseUrl
    ? `${webhookBaseUrl.replace(/\/$/, '')}/webhook/fb-publish-executor`
    : '<N8N_WEBHOOK_BASE_URL_REQUIRED>/webhook/fb-publish-executor';
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
