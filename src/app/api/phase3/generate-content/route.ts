import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { invokeLlm } from '@/lib/llm-client';

export const dynamic = 'force-dynamic';

const GenerateContentPayloadSchema = z.object({
  contentItemId: z.string().uuid('Must be a valid UUID'),
  tenant_id: z.string().optional(),
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'generate_content_call', GenerateContentPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;
  const { contentItemId } = payload;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (!supabaseUrl || !supabaseKey || !openAiKey) {
    const errorMsg = 'Credentials missing';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: errorMsg }, { status: 500 });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    // 2. Fetch Content Item
    const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
      cache: 'no-store',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    
    const items = await itemRes.json();
    if (!items || items.length === 0) {
      await logCompletion('FAILED', 'Content item not found');
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Content item not found' }, { status: 404 });
    }
    const item = items[0];

    if (item.state !== 'idea') {
      await logCompletion('FAILED', `Invalid state. Expected 'idea', got '${item.state}'`);
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

    // 3. Generate Content via OpenAI (GPT-4o-mini for speed and cost)
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
    const llmResponse = await invokeLlm({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    }, {
      actorId: 'n8n_generate_content',
      tenantId: payload.tenant_id || 'system',
      requestId: req.headers.get('x-request-id') || 'unknown'
    });

    const content = JSON.parse(llmResponse.choices[0].message.content);

    // 4. Generate Image via DALL-E 3
    console.log(`[Content Generator] Calling DALL-E for image...`);
    let imageUrl = "https://placehold.co/1024x1024?text=Image+Generation+Failed";
    
    try {
      const imageResponse = await invokeLlm({
        model: 'dall-e-3',
        prompt: content.image_prompt,
        n: 1,
        size: '1024x1024'
      }, {
        actorId: 'n8n_generate_content',
        tenantId: payload.tenant_id || 'system',
        requestId: req.headers.get('x-request-id') || 'unknown',
        endpointUrl: 'https://api.openai.com/v1/images/generations'
      });
      imageUrl = imageResponse.data[0].url;
    } catch (imageErr) {
      console.error("DALL-E generation failed:", imageErr);
      // Continue anyway with placeholder
    }

    // 5. Update States & Insert Assets
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

    await logCompletion('ACCEPTED', 'Content generated successfully', { contentItemId });
    return NextResponse.json({ 
      status: 'OK', 
      message: 'Content generated successfully',
      assets_generated: 3
    });

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
