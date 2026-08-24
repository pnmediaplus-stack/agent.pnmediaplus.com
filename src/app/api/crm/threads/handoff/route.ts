import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { threadId, status } = body;

    if (!threadId || !status) return new NextResponse('Missing fields', { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/crm_threads?id=eq.${threadId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) throw new Error(await res.text());
    
    const threads = await res.json();
    return NextResponse.json(threads[0]);
  } catch (error: any) {
    console.error('Error toggling handoff:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

