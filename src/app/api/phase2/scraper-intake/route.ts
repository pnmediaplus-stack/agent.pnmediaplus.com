import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const ScrapedMetricSchema = z.object({
  content_item_id: z.string(),
  channel: z.string(),
  impressions: z.number().default(0),
  reach: z.number().default(0),
  views: z.number().default(0),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  saves: z.number().default(0),
  clicks: z.number().default(0)
});

const ScraperIntakePayloadSchema = z.object({
  metrics: z.array(ScrapedMetricSchema)
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'performance_scraper_intake', ScraperIntakePayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;

  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    const scrapedRecords = [];

    // 2. Process each metric received from N8N
    for (const metric of payload.metrics) {
      
      const ctr = metric.impressions > 0 ? (metric.clicks / metric.impressions) * 100 : 0;
      const performance_score = (metric.likes * 2 + metric.comments * 5 + metric.clicks * 3) / 100;

      const newPerformanceRecord = {
        content_item_id: metric.content_item_id,
        owner_ref: 'agent_data_analyst',
        source_ref: metric.channel,
        
        impressions: Math.round(metric.impressions),
        reach: Math.round(metric.reach),
        views: Math.round(metric.views),
        likes: Math.round(metric.likes),
        comments: Math.round(metric.comments),
        shares: Math.round(metric.shares),
        saves: Math.round(metric.saves),
        clicks: Math.round(metric.clicks),
        "CTR": Number(ctr.toFixed(4)),
        performance_score: Number(performance_score.toFixed(4)),
        
        notes: `Auto-scraped via N8N Workflow`
      };

      // 3. Insert into Supabase
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records`, {
        method: 'POST',
        cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerformanceRecord)
      });

      if (insertRes.ok) {
        scrapedRecords.push(newPerformanceRecord);
      } else {
        const errorText = await insertRes.text();
        console.error("Failed to insert metric", errorText);
      }
    }

    await logCompletion('ACCEPTED', `Inserted ${scrapedRecords.length} performance records`);
    
    return NextResponse.json({ 
      status: 'OK', 
      recordsProcessed: scrapedRecords.length 
    });

  } catch (error: any) {
    await logCompletion('FAILED', `Performance Scraper Intake Error: ${error.message}`);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
