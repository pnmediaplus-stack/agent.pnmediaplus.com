import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const GenerateLessonsPayloadSchema = z.any(); // No specific payload required for this cron-like task

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'generate_lessons_call', GenerateLessonsPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { logCompletion } = guard;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (!supabaseUrl || !supabaseKey || !openAiKey) {
    const errorMsg = 'Missing Supabase or OpenAI credentials';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: errorMsg }, { status: 500 });
  }

  try {
    // 2. Fetch top performing records (e.g. CTR > 1 or views > 10)
    const perfRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records?or=(CTR.gt.1,views.gt.10)&order=performance_score.desc&limit=5`, {
      cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const topPerformers = await perfRes.json();

    if (!topPerformers || topPerformers.length === 0) {
      await logCompletion('ACCEPTED', 'No top performing posts found');
      return NextResponse.json({ status: 'OK', message: 'No top performing posts found', generated_count: 0 });
    }

    // 3. Fetch existing lessons to avoid duplicates
    const existingLessonsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_lessons_learned?select=contentItemId`, {
      cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const existingLessons = await existingLessonsRes.json() || [];
    const existingIds = existingLessons.map((l: any) => l.contentItemId);

    const recordsToProcess = topPerformers.filter((p: any) => !existingIds.includes(p.content_item_id));

    if (recordsToProcess.length === 0) {
      await logCompletion('ACCEPTED', 'All top performing posts already have lessons');
      return NextResponse.json({ status: 'OK', message: 'All top performing posts already have lessons', generated_count: 0 });
    }

    let generatedCount = 0;

    for (const record of recordsToProcess) {
      // 4. Fetch Content Item & Assets
      const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${record.content_item_id}`, {
        cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const items = await itemRes.json();
      if (!items || items.length === 0) continue;
      const item = items[0];

      const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets?content_item_id=eq.${record.content_item_id}`, {
        cache: 'no-store', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const assets = await assetsRes.json() || [];
      
      const captionAsset = assets.find((a: any) => a.asset_type === 'caption_text');
      const captionText = captionAsset ? captionAsset.asset_uri : '';

      // 5. Analyze with OpenAI
      const prompt = `
You are an expert Social Media Data Analyst.
Analyze the following successful social media post and extract 3 short, actionable lessons learned (marketing insights) for future campaigns.

Topic: ${item.title}
Performance: ${record.views} views, ${record.likes} likes, CTR: ${record.CTR}%
Caption Used:
${captionText.substring(0, 500)}...

Return ONLY the 3 bullet points, concise and insightful.
      `;

      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const aiData = await openAiRes.json();
      const lessonText = aiData.choices?.[0]?.message?.content || 'Lesson extraction failed.';
      const metricHighlight = `${record.views} Views | ${record.CTR}% CTR`;

      // 6. Insert into lessons_learned
      const insertPayload = {
        contentItemId: record.content_item_id,
        lessonText: lessonText,
        metricHighlight: metricHighlight
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/phase2_lessons_learned`, {
        method: 'POST',
        headers: { 
          apikey: supabaseKey, 
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(insertPayload)
      });

      if (insertRes.ok) {
        generatedCount++;
      } else {
        console.error("Failed to insert lesson:", await insertRes.text());
      }
    }

    await logCompletion('ACCEPTED', `Generated ${generatedCount} new lessons`);
    return NextResponse.json({ 
      status: 'OK', 
      generated_count: generatedCount 
    });

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error occurred during generation';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
