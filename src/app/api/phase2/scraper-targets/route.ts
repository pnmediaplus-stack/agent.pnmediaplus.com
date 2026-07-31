import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const ScraperTargetsPayloadSchema = z.record(z.string(), z.any());

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'performance_scraper_targets', ScraperTargetsPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { logCompletion } = guard;

  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    // 2. Fetch published content items
    const publishedRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?state=eq.published`, {
      cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const publishedItems = await publishedRes.json();

    if (!publishedItems || publishedItems.length === 0) {
      await logCompletion('ACCEPTED', 'No published items to scrape');
      return NextResponse.json({ status: 'OK', message: 'No published items to scrape', targets: [] });
    }

    const contentIds = publishedItems.map((item: any) => item.id);
    const inQuery = contentIds.join(',');

    // 3. Fetch publish records for these items
    const prRes = await fetch(`${supabaseUrl}/rest/v1/phase2_publish_records?content_item_id=in.(${inQuery})`, {
      cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const publishRecords = await prRes.json();

    await logCompletion('ACCEPTED', `Fetched ${publishRecords.length} targets`);
    
    return NextResponse.json({ 
      status: 'OK', 
      targets: publishRecords 
    });

  } catch (error: any) {
    await logCompletion('FAILED', `Performance Scraper Targets Error: ${error.message}`);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
