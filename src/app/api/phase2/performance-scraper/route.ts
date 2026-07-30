import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------
// ADAPTER PATTERN CHO PERFORMANCE SCRAPER
// ----------------------------------------------------------------------

interface PlatformMetrics {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  watch_time: number;
}

interface PerformanceAdapter {
  scrapeMetrics(platformAssetId: string): Promise<PlatformMetrics>;
}

// Mock Adapter cho Telegram
class TelegramMockAdapter implements PerformanceAdapter {
  async scrapeMetrics(platformAssetId: string): Promise<PlatformMetrics> {
    // Giả lập số liệu: random
    // Random views from 100 to 5000
    const views = Math.floor(Math.random() * 4900) + 100;
    // Likes are usually 5-10% of views
    const likes = Math.floor(views * (Math.random() * 0.05 + 0.05));
    // Comments are usually 1-5% of views
    const comments = Math.floor(views * (Math.random() * 0.04 + 0.01));
    // Clicks on links
    const clicks = Math.floor(views * (Math.random() * 0.1 + 0.02));

    return {
      impressions: views * 1.5,
      reach: views * 1.2,
      views,
      likes,
      comments,
      shares: Math.floor(likes * 0.2),
      saves: Math.floor(likes * 0.5),
      clicks,
      watch_time: 0
    };
  }
}

// Factory Pattern
function getAdapter(channel: string): PerformanceAdapter {
  switch (channel) {
    case 'telegram':
      return new TelegramMockAdapter();
    case 'facebook':
      // Sau này sẽ Return new FacebookGraphAdapter()
      return new TelegramMockAdapter(); // Tạm thời fall back
    default:
      return new TelegramMockAdapter();
  }
}

// ----------------------------------------------------------------------
// API ROUTE
// ----------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    // 1. Kiểm tra Authority (Yêu cầu cronjob phải gọi bằng CONTROL_PLANE_SECRET)
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN_ACTOR', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    // 2. Lấy danh sách các bài viết đang được xuất bản (để cào data)
    const publishedRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?state=eq.published`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const publishedItems = await publishedRes.json();

    if (!publishedItems || publishedItems.length === 0) {
      return NextResponse.json({ status: 'OK', message: 'No published items to scrape', recordsProcessed: 0 });
    }

    const contentIds = publishedItems.map((item: any) => item.id);
    const inQuery = contentIds.join(',');

    // 3. Lấy Publish Records tương ứng
    const prRes = await fetch(`${supabaseUrl}/rest/v1/phase2_publish_records?content_item_id=in.(${inQuery})`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const publishRecords = await prRes.json();

    const scrapedRecords = [];

    // 4. Quét qua từng record và gọi Adapter
    for (const record of publishRecords) {
      const adapter = getAdapter(record.channel);
      const metrics = await adapter.scrapeMetrics(record.external_id || '');
      
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
      const performance_score = (metrics.likes * 2 + metrics.comments * 5 + metrics.clicks * 3) / 100;

      const newPerformanceRecord = {
        content_item_id: record.content_item_id,
        owner_ref: 'agent_data_analyst',
        source_ref: record.channel,
        
        impressions: Math.round(metrics.impressions),
        reach: Math.round(metrics.reach),
        views: Math.round(metrics.views),
        likes: Math.round(metrics.likes),
        comments: Math.round(metrics.comments),
        shares: Math.round(metrics.shares),
        saves: Math.round(metrics.saves),
        clicks: Math.round(metrics.clicks),
        "CTR": Number(ctr.toFixed(4)),
        performance_score: Number(performance_score.toFixed(4)),
        
        notes: `Auto-scraped via ${record.channel} adapter`
      };

      // 5. Insert vào Supabase
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records`, {
        method: 'POST',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerformanceRecord)
      });

      if (insertRes.ok) {
        scrapedRecords.push(newPerformanceRecord);
      } else {
        const errorText = await insertRes.text();
        console.error("Insert failed:", errorText);
      }
    }

    return NextResponse.json({ 
      status: 'OK', 
      recordsProcessed: scrapedRecords.length 
    });

  } catch (error: any) {
    console.error("Performance Scraper Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
