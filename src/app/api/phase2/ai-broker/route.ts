import { NextResponse } from 'next/server';

async function logAudit(reason: string, status: 'BLOCKED' | 'FAILED') {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/phase1_audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actor_type: 'SYSTEM',
        actor_external_ref: 'nextjs:ai-broker',
        action: 'broker_llm_failed',
        entity_type: 'CONTENT_ITEM',
        reason,
        after_state: status,
        metadata: { 
          cross_phase_audit: true, 
          intent: 'Phase 2 AI Broker Fail-Closed Validation' 
        }
      })
    });
  } catch (e) {
    console.error("Broker failed to write audit log:", e);
  }
}

export async function POST(request: Request) {
  // 1. Verify CONTROL_PLANE_SECRET
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CONTROL_PLANE_SECRET?.trim();
  
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Read OpenAI Key (Environment Adapter)
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const errorMsg = 'OPENAI_API_KEY is missing on Broker';
    await logAudit(errorMsg, 'BLOCKED');
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  // 3. Get Payload
  const payload = await request.json().catch(() => ({}));
  
  // 4. Forward to OpenAI
  const openaiUrl = (process.env.BYOK_OPENAI_CHAT_COMPLETIONS_URL || 'https://api.openai.com/v1/chat/completions').trim();
  
  try {
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) // model, messages, temperature etc.
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = `OpenAI API Error: ${response.status} - ${JSON.stringify(data)}`;
      await logAudit(errorMsg, 'BLOCKED');
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    // Success
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    const errorMsg = `Broker Network Error: ${error.message}`;
    await logAudit(errorMsg, 'BLOCKED');
    return NextResponse.json({ error: errorMsg }, { status: 502 });
  }
}
