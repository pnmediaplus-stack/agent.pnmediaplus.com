export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN_ACTOR', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const body = await req.json();
    const { contentItemId } = body;

    if (!contentItemId) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing contentItemId' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Credentials missing' }, { status: 500 });
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch Content Item
    const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
      cache: 'no-store',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    
    const items = await itemRes.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Content item not found' }, { status: 404 });
    }
    const item = items[0];

    if (item.state !== 'idea') {
      return NextResponse.json({ error: 'INVALID_STATE', message: `Expected state 'idea', got '${item.state}'` }, { status: 400 });
    }

    console.log(`[Content Generator] Starting generation for idea: ${item.title}`);

    // Helper to sequentially step through the state machine
    const updateState = async (newState: string) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: newState })
      });
      if (!res.ok) throw new Error(`State transition to ${newState} failed: ${await res.text()}`);
    };

    // 2. Generate Content via OpenAI (GPT-4o-mini for speed and cost)
    const prompt = `You are an expert Social Media Content Creator.
Based on the following idea, generate a short, engaging social media post caption and a 3-point research summary.

Idea Title: ${item.title}
Brief: ${item.brief || 'No brief provided.'}

Respond in STRICT JSON format:
{
  "research_packet": "- Point 1\\n- Point 2\\n- Point 3",
  "caption_output": "The engaging caption text here with emojis... #hashtag",
  "image_prompt": "A highly detailed, aesthetic midjourney style image prompt describing what the image should look like to accompany this post."
}`;

    console.log(`[Content Generator] Calling OpenAI for text...`);
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });

    if (!openAiRes.ok) throw new Error(`OpenAI Text Error: ${await openAiRes.text()}`);
    const aiData = await openAiRes.json();
    const content = JSON.parse(aiData.choices[0].message.content);

    // 3. Generate Image via DALL-E 3
    console.log(`[Content Generator] Calling DALL-E for image...`);
    const imageRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: content.image_prompt,
        n: 1,
        size: '1024x1024'
      })
    });

    let imageUrl = "https://placehold.co/1024x1024?text=Image+Generation+Failed";
    if (imageRes.ok) {
      const imgData = await imageRes.json();
      imageUrl = imgData.data[0].url;
    } else {
      console.error("DALL-E generation failed:", await imageRes.text());
      // Continue anyway with placeholder
    }

    // 4. Update States & Insert Assets
    console.log(`[Content Generator] Saving assets...`);
    await updateState('research_ready');
    await updateState('visual_ready');
    await updateState('caption_ready');

    const assetsBody = [
      { content_item_id: contentItemId, owner_ref: 'agent_content_creator', asset_type: 'viral_research_packet', asset_key: 'res_' + Date.now(), asset_uri: content.research_packet },
      { content_item_id: contentItemId, owner_ref: 'agent_content_creator', asset_type: 'visual_asset', asset_key: 'vis_' + Date.now(), asset_uri: imageUrl },
      { content_item_id: contentItemId, owner_ref: 'agent_content_creator', asset_type: 'caption_output', asset_key: 'cap_' + Date.now(), asset_uri: content.caption_output }
    ];
    
    const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets`, { method: 'POST', headers, body: JSON.stringify(assetsBody) });
    if (!assetsRes.ok) throw new Error(`Assets Insert Error: ${await assetsRes.text()}`);

    // Move to QA Ready!
    await updateState('QA_ready');

    return NextResponse.json({ 
      status: 'OK', 
      message: 'Content generated successfully',
      assets_generated: 3
    });

  } catch (error: any) {
    console.error("Generate Content Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
