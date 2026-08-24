import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

    const body = await req.json();
    const { threadId, content, organizationId } = body;

    if (!threadId || !content) return new NextResponse('Missing fields', { status: 400 });

    // 1. Insert into DB so UI updates via Realtime
    const { data: message, error } = await supabase
      .from('crm_messages')
      .insert({
        organization_id: organizationId,
        thread_id: threadId,
        sender_type: 'human',
        content,
        delivery_status: 'queued'
      })
      .select('*')
      .single();

    if (error) throw error;

    // 2. Mock sending to Facebook API (or triggering n8n outbound webhook)
    // In a real implementation, we would redeem the BYOK token and call Graph API
    setTimeout(async () => {
      // Simulate success
      await createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get() { return ''; } } }
      )
      .from('crm_messages')
      .update({ delivery_status: 'sent' })
      .eq('id', message.id);
    }, 1000);

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
