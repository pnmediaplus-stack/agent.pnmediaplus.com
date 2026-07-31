import { NextResponse } from 'next/server';
import { invokeLlm } from '@/lib/llm-client';
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    // TODO: Require authentication or opt-in token for OpenAI billing
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const body = await req.json();
    const { title, goal, target_audience, num_ideas = 3 } = body;

    if (!title || !goal) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing title or goal' }, { status: 400 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'OpenAI API Key missing. Opt-in required for Phase 4.' }, { status: 500 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Create Campaign in DB
    const campaignPayload = {
      title,
      goal_description: goal,
      target_audience: target_audience || 'General audience',
      status: 'active'
    };

    const campaignRes = await fetch(`${supabaseUrl}/rest/v1/phase4_campaigns`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(campaignPayload)
    });

    if (!campaignRes.ok) {
      return NextResponse.json({ error: 'DB_ERROR', message: `Campaign creation failed: ${await campaignRes.text()}` }, { status: 500 });
    }
    const campaignData = await campaignRes.json();
    const campaignId = campaignData[0].id;

    // 2. Call OpenAI to generate Ideas
    const prompt = `You are an expert Marketing Campaign Planner AI.
Goal: ${goal}
Target Audience: ${target_audience || 'General'}

Generate ${num_ideas} distinct content ideas for this campaign.
Respond in STRICT JSON format like this:
{
  "ideas": [
    {
      "title": "A catchy title for the content piece",
      "brief": "A short brief instructing the content creator on what to write about."
    }
  ]
}`;

    console.log(`[Campaign Planner] Calling OpenAI to generate ${num_ideas} ideas...`);
    
    const llmResponse = await invokeLlm({
      model: 'gpt-4o', // using gpt-4o for high-level planning
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    }, {
      actorId: 'n8n_generate_campaign',
      tenantId: 'default',
      requestId: req.headers.get('x-request-id') || 'unknown'
    });

    const aiResult = JSON.parse(llmResponse.choices[0].message.content);
    const ideas = aiResult.ideas || [];

    // 3. Insert Ideas into content_items
    const contentItemsBody = ideas.map((idea: any) => ({
      content_key: `camp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      owner_ref: 'agent_campaign_planner',
      title: idea.title,
      brief: idea.brief,
      state: 'idea',
      campaign_id: campaignId
    }));

    const contentRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contentItemsBody)
    });

    if (!contentRes.ok) throw new Error(`Content Items Insert Error: ${await contentRes.text()}`);

    return NextResponse.json({ 
      status: 'OK', 
      message: 'Campaign planned and ideas generated successfully',
      campaignId,
      ideasGenerated: ideas.length
    });

  } catch (error: any) {
    console.error("Generate Campaign Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
