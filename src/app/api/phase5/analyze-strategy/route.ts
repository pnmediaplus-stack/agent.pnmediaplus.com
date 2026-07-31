import { NextResponse } from 'next/server';
import { invokeLlm } from '@/lib/llm-client';
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'OpenAI API Key missing.' }, { status: 500 });
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

    // 1. Fetch active strategy
    const stratRes = await fetch(`${supabaseUrl}/rest/v1/phase5_strategies?status=eq.active&limit=1`, { headers });
    const strategies = await stratRes.json();
    
    if (!strategies || strategies.length === 0) {
      return NextResponse.json({ status: 'OK', message: 'No active strategy found to analyze.' });
    }
    const currentStrategy = strategies[0];

    // 2. Check if a pivot proposal is already pending
    const propRes = await fetch(`${supabaseUrl}/rest/v1/phase5_pivot_proposals?strategy_id=eq.${currentStrategy.id}&status=eq.pending_approval`, { headers });
    const pendingProposals = await propRes.json();
    if (pendingProposals && pendingProposals.length > 0) {
      return NextResponse.json({ status: 'OK', message: 'A pivot proposal is already pending approval. Cannot analyze further.' });
    }

    // 3. Fetch recent lessons learned (Simulated for MVP since lessons might not be fully fleshed out yet)
    // In a full implementation, we'd query pn_content_phase1.lessons_learned or similar
    const lessonsRes = await fetch(`${supabaseUrl}/rest/v1/phase1_lessons_learned?order=created_at.desc&limit=20`, { headers });
    let lessons = [];
    if (lessonsRes.ok) {
      lessons = await lessonsRes.json();
    }
    
    // If no real lessons exist (e.g. testing phase), inject a dummy lesson for demonstration
    if (lessons.length === 0) {
      lessons = [{ lesson_text: "Our recent campaigns received very low engagement. The target audience (Gen Z) seems unresponsive to long-form text. They prefer short, punchy visual hooks." }];
    }

    // 4. Prompt CMO AI to analyze
    const body = await req.json().catch(() => ({}));

    if (!body.tenant_id) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing tenant_id for billing' }, { status: 400 });
    }

    const locale = body.locale || 'vi';
    const isVi = locale === 'vi';
    
    const lessonsText = lessons.map((l: any) => `- ${l.lesson_text || JSON.stringify(l)}`).join('\n');
    const langInstruction = isVi 
      ? "IMPORTANT: Your reasoning and proposed_direction MUST be written entirely in Vietnamese (Tiếng Việt)."
      : "IMPORTANT: Your reasoning and proposed_direction MUST be written entirely in English.";
    
    const prompt = `You are a ruthless, data-driven Chief Marketing Officer AI.
Your current ACTIVE STRATEGY is: "${currentStrategy.name}"
Vision: "${currentStrategy.vision}"

Here are the recent lessons learned from the field:
${lessonsText}

Your task: Evaluate if we should PIVOT (change direction) or STAY THE COURSE.
If the lessons indicate failure or a mismatch, you MUST pivot. 
${langInstruction}

If we should pivot, respond with STRICT JSON:
{
  "should_pivot": true,
  "reasoning": "${isVi ? 'Giải thích chi tiết lý do tại sao chiến lược hiện tại đang thất bại (Bằng tiếng Việt).' : 'Detailed explanation of why the current strategy is failing based on the lessons (In English).'}",
  "proposed_direction": "${isVi ? 'Hướng đi mới rõ ràng, khả thi để thay thế chiến lược cũ (Bằng tiếng Việt).' : 'A clear, actionable new strategy vision (In English).'}"
}
If we should stay the course, respond with STRICT JSON:
{
  "should_pivot": false
}`;

    const llmResponse = await invokeLlm({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    }, {
      actorId: 'n8n_analyze_strategy',
      tenantId: body.tenant_id, // STRICT TENANT SCOPE
      requestId: req.headers.get('x-request-id') || 'unknown'
    });

    const aiResult = JSON.parse(llmResponse.choices[0].message.content);

    // 5. Create Pivot Proposal if needed
    if (aiResult.should_pivot) {
      const proposalPayload = {
        strategy_id: currentStrategy.id,
        reasoning: aiResult.reasoning,
        proposed_direction: aiResult.proposed_direction,
        status: 'pending_approval'
      };

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/phase5_pivot_proposals`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(proposalPayload)
      });

      if (!insertRes.ok) throw new Error(`Proposal Insert Error: ${await insertRes.text()}`);
      
      const insertData = await insertRes.json();
      
      return NextResponse.json({
        status: 'PIVOT_PROPOSED',
        message: 'CMO AI has proposed a pivot.',
        proposal: insertData[0]
      });
    }

    return NextResponse.json({ 
      status: 'STAY_COURSE', 
      message: 'CMO AI evaluated the strategy and decided to stay the course.'
    });

  } catch (error: any) {
    console.error("CMO Analyze Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
