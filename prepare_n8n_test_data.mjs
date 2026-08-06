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
  console.log("🌱 Đang chuẩn bị nguyên liệu (Data) cho bộ máy N8N...");

  // 1. Tạo Content Item
  const contentBody = [{
    content_key: 'n8n_test_publish_' + Date.now(),
    owner_ref: 'agent', // Actor
    title: 'Post Facebook Tự Động bằng N8N & BYOK Vault',
    brief: 'Test luồng end-to-end từ Scheduled -> Publish',
    state: 'idea' // Bắt đầu từ idea
  }];

  const contentRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(contentBody)
  });

  if (!contentRes.ok) {
    console.error("❌ Lỗi tạo Content Item:", await contentRes.text());
    return;
  }
  
  const contentData = (await contentRes.json())[0];
  const itemId = contentData.id;
  console.log(`✅ [1] Đã tạo Content Item ID: ${itemId}`);

  // Hàm helper update state
  async function updateState(newState) {
    const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: newState })
    });
    if (!res.ok) throw new Error(`Lỗi update state ${newState}: ${await res.text()}`);
    console.log(`✅ Chuyển trạng thái -> ${newState}`);
  }

  try {
    // 2. Chuyển qua các bước sản xuất
    await updateState('research_ready');
    await updateState('visual_ready');
    await updateState('caption_ready');

    // 3. Tạo Assets (Hình ảnh và nội dung)
    const captionContent = "🚀 Chào mừng đến với kỷ nguyên AI! Đây là bài post được đăng hoàn toàn tự động bằng hệ thống N8N kết hợp với bảo mật BYOK Vault của hệ điều hành PN OS.\n\n#PNMedia #AIAgent #Automation";
    const imageUrl = "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop";

    const assetsBody = [
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'viral_research_packet', asset_key: 'res_' + Date.now(), asset_uri: 'http://test/res' },
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'visual_asset', asset_key: 'img_' + Date.now(), asset_uri: imageUrl },
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'caption_output', asset_key: 'cap_' + Date.now(), asset_uri: captionContent }
    ];
    
    const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets`, { method: 'POST', headers, body: JSON.stringify(assetsBody) });
    if (!assetsRes.ok) throw new Error(`Lỗi tạo Assets: ${await assetsRes.text()}`);
    console.log("✅ [2] Đã đính kèm Assets (Hình ảnh & Caption).");

    await updateState('QA_ready');

    // 4. Giả lập QA Pass
    const qaBody = [{
      content_item_id: itemId,
      reviewer_ref: 'human_qa',
      verdict: 'pass',
      average_score: 10,
      overclaim_risk: 0,
      missing_asset: false,
      evidence_ref: 'qa_evidence_pass',
      reviewed_at: new Date().toISOString()
    }];
    const qaRes = await fetch(`${supabaseUrl}/rest/v1/phase2_qa_reviews`, { method: 'POST', headers, body: JSON.stringify(qaBody) });
    if (!qaRes.ok) throw new Error(`Lỗi tạo QA: ${await qaRes.text()}`);
    console.log("✅ [3] Giả lập duyệt QA (Điểm 10/10).");

    await updateState('QA_passed');
    
    // 5. Đưa vào trạng thái Scheduled để N8N lấy đi Publish
    await updateState('scheduled');

    console.log("\n🎉 NGUYÊN LIỆU ĐÃ SẴN SÀNG!");
    console.log("=============================================");
    console.log(`📌 ID Bài Viết (Item ID): ${itemId}`);
    console.log(`📌 Trạng thái hiện tại: scheduled`);
    console.log(`📌 Bước tiếp theo: Chạy N8N để fetch bài viết này và Publish lên Facebook!`);
    console.log("=============================================");

  } catch (err) {
    console.error("❌ Lỗi trong quá trình chuẩn bị:", err.message);
  }
}

seedData();
