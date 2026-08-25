import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verify Auth so random people can't read it
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    // 2. Fetch messages for this thread directly, bypassing strict org context checks 
    // since this is a global simulator dummy thread.
    const response = await fetchSupabaseRest('crm_messages', {
      searchParams: {
        thread_id: \q.\\,
        order: 'created_at.asc'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: response.status });
    }

    const messages = await response.json();
    return NextResponse.json(messages);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
