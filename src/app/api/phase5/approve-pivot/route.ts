import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const body = await req.json();
    const { proposal_id } = body;

    if (!proposal_id) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing proposal_id' }, { status: 400 });
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

    // 1. Fetch the proposal
    const propRes = await fetch(`${supabaseUrl}/rest/v1/phase5_pivot_proposals?id=eq.${proposal_id}`, { headers });
    const proposals = await propRes.json();
    if (!proposals || proposals.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    if (proposal.status !== 'pending_approval') {
      return NextResponse.json({ error: 'INVALID_STATE', message: 'Proposal is not pending approval' }, { status: 400 });
    }

    // 2. Fail-Closed Pause: Pause all active campaigns under the old strategy FIRST
    // We update status to 'paused'
    const oldStrategyId = proposal.strategy_id;
    const pauseRes = await fetch(`${supabaseUrl}/rest/v1/phase4_campaigns?strategy_id=eq.${oldStrategyId}&status=eq.active`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'paused' })
    });

    if (!pauseRes.ok) {
      // Fail closed: if we can't pause the old campaigns, abort the pivot!
      return NextResponse.json({ error: 'DB_ERROR', message: `Failed to pause old campaigns. Aborting pivot to prevent data drift.` }, { status: 500 });
    }

    // 3. Mark Proposal as approved
    await fetch(`${supabaseUrl}/rest/v1/phase5_pivot_proposals?id=eq.${proposal_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'approved' })
    });

    // 4. Mark old strategy as abandoned
    await fetch(`${supabaseUrl}/rest/v1/phase5_strategies?id=eq.${oldStrategyId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'abandoned' })
    });

    // 5. Create new strategy based on proposal
    const newStrategyPayload = {
      name: `[PIVOT] ${new Date().toISOString().split('T')[0]}`,
      vision: proposal.proposed_direction,
      status: 'active'
    };

    const newStratRes = await fetch(`${supabaseUrl}/rest/v1/phase5_strategies`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(newStrategyPayload)
    });

    if (!newStratRes.ok) {
       return NextResponse.json({ error: 'DB_ERROR', message: `Failed to create new strategy.` }, { status: 500 });
    }
    const newStrategyData = await newStratRes.json();

    return NextResponse.json({ 
      status: 'OK', 
      message: 'Pivot approved. Old strategy abandoned, campaigns paused, and new strategy activated.',
      newStrategyId: newStrategyData[0].id
    });

  } catch (error: any) {
    console.error("Approve Pivot Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
