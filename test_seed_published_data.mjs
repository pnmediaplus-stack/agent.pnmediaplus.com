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
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function seedData() {
  console.log("🌱 Bắt đầu tạo dữ liệu test tự động (Tuân thủ State Machine)...");

  // 1. Tạo Content Item ở trạng thái 'idea'
  const contentBody = [{
    content_key: 'test_auto_marketing_campaign_' + Date.now(),
    owner_ref: 'test_user',
    title: 'Bí kíp Xây dựng Bầy đàn AI Marketing 2026',
    brief: 'Hướng dẫn tự động hóa mọi khâu từ viết bài đến phân tích',
    state: 'idea'
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
  console.log("✅ Đã tạo Content Item (idea):", contentData.title);

  // Helper để update state
  async function updateState(newState) {
    const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: newState })
    });
    if (!res.ok) throw new Error(`Lỗi update state ${newState}: ${await res.text()}`);
    console.log(`✅ State -> ${newState}`);
  }

  try {
    await updateState('research_ready');
    await updateState('visual_ready');
    await updateState('caption_ready');

    // 2. Tạo 3 Assets để qua được QA_ready
    const assetsBody = [
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'viral_research_packet', asset_key: 'res_' + Date.now(), asset_uri: 'http://test/res' },
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'visual_asset', asset_key: 'vis_' + Date.now(), asset_uri: 'http://test/vis' },
      { content_item_id: itemId, owner_ref: 'agent', asset_type: 'caption_output', asset_key: 'cap_' + Date.now(), asset_uri: 'http://test/cap' }
    ];
    const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets`, { method: 'POST', headers, body: JSON.stringify(assetsBody) });
    if (!assetsRes.ok) throw new Error(`Lỗi tạo Assets: ${await assetsRes.text()}`);
    console.log("✅ Đã tạo đủ 3 Assets.");

    await updateState('QA_ready');

    // 3. Tạo QA Review điểm cao
    const qaBody = [{
      content_item_id: itemId,
      reviewer_ref: 'agent_qa',
      verdict: 'pass',
      average_score: 9.5,
      overclaim_risk: 1,
      missing_asset: false,
      evidence_ref: 'qa_evidence',
      reviewed_at: new Date().toISOString()
    }];
    const qaRes = await fetch(`${supabaseUrl}/rest/v1/phase2_qa_reviews`, { method: 'POST', headers, body: JSON.stringify(qaBody) });
    if (!qaRes.ok) throw new Error(`Lỗi tạo QA: ${await qaRes.text()}`);
    console.log("✅ Đã tạo QA Review Pass (Điểm 9.5).");

    await updateState('QA_passed');
    await updateState('scheduled');
    await updateState('published');

    // 4. Tạo Publish Record
    const publishBody = [{
      content_item_id: itemId,
      channel: 'telegram',
      external_id: 'msg_test_' + Date.now(),
      external_url: 'https://t.me/test/' + Date.now(),
      status: 'published',
      published_at: new Date().toISOString()
    }];
    const publishRes = await fetch(`${supabaseUrl}/rest/v1/phase2_publish_records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(publishBody)
    });
    if (!publishRes.ok) throw new Error(`Lỗi tạo Publish Record: ${await publishRes.text()}`);
    console.log("✅ Đã tạo Publish Record trên kênh Telegram.");
    
    console.log("🚀 Hoàn tất! Vòng đời bài viết đã hợp lệ. Bây giờ bạn có thể sang N8N bấm [Execute Workflow].");
  } catch (err) {
    console.error(err);
  }
}

seedData();
