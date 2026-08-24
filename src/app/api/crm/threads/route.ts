import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    // Assuming we fetch threads for the organization the user belongs to.
    // In a real multi-tenant app, orgId might be in a cookie, header, or query param.
    // For now, we'll fetch all threads the user's RLS policy allows them to see.

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('crm_threads')
      .select(`
        id, status, last_message_at, unread_count, channel_id, customer_id,
        channel:crm_channels ( channel_name, channel_type, avatar_url ),
        customer:crm_customers ( id, full_name, phone_number, tags, email, address, notes )
      `)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
