import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verify Auth so random people can't read it
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    // 2. ONLY allow reading the specific dummy thread for simulator purposes
    // Prevent IDOR and Tenant Boundary violations
    const DUMMY_THREAD_ID = '33333333-3333-3333-3333-333333333333';

    // 3. Fetch messages for this dummy thread directly
    const response = await fetchSupabaseRest('crm_messages', {
      searchParams: {
        thread_id: `eq.${DUMMY_THREAD_ID}`,
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
