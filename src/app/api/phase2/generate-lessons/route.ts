import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN_ACTOR', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Credentials missing' }, { status: 500 });
    }

    // 1. Fetch top performing records (e.g. CTR > 1 or views > 10)
    const perfRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records?or=(CTR.gt.1,views.gt.10)&order=performance_score.desc&limit=5`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const topPerformers = await perfRes.json();

    if (!topPerformers || topPerformers.length === 0) {
      return NextResponse.json({ status: 'OK', message: 'No top performing posts found', generated_count: 0 });
    }

    // 2. Fetch existing lessons to avoid duplicates
    const existingLessonsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_lessons_learned?select=contentItemId`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const existingLessons = await existingLessonsRes.json() || [];
    const existingIds = existingLessons.map((l: any) => l.contentItemId);

    const recordsToProcess = topPerformers.filter((p: any) => !existingIds.includes(p.content_item_id));

    if (recordsToProcess.length === 0) {
      return NextResponse.json({ status: 'OK', message: 'All top performing posts already have lessons', generated_count: 0 });
    }

    let generatedCount = 0;

    for (const record of recordsToProcess) {
      // 3. Fetch Content Item & Assets
      const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${record.content_item_id}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const items = await itemRes.json();
      if (!items || items.length === 0) continue;
      const item = items[0];

      const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets?content_item_id=eq.${record.content_item_id}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const assets = await assetsRes.json() || [];
      
      const captionAsset = assets.find((a: any) => a.asset_type === 'caption_text');
      const captionText = captionAsset ? captionAsset.asset_uri : '';

      // 4. Analyze with OpenAI
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

      // 5. Insert into lessons_learned (bypass PostgREST view mapping issues by inserting into raw table via service role)
      // Actually, since we created a public view phase2_lessons_learned, let's insert into the underlying table using the correct schema
      const insertPayload = {
        content_item_id: record.content_item_id,
        lesson_text: lessonText,
        metric_highlight: metricHighlight
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/lessons_learned`, {
        method: 'POST',
        headers: { 
          apikey: supabaseKey, 
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Content-Profile': 'pn_content_phase2'
        },
        body: JSON.stringify(insertPayload)
      });

      if (insertRes.ok) {
        generatedCount++;
      } else {
        console.error("Failed to insert lesson:", await insertRes.text());
      }
    }

    return NextResponse.json({ 
      status: 'OK', 
      generated_count: generatedCount 
    });

  } catch (error: any) {
    console.error("Generate Lessons Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
